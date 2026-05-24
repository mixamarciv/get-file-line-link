import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

type TGenerateFileLinkParams = {
	extensionPath: string;
	filePath: string;
	lineNumber: number;
};

type TComputeFileLinkParams = {
	filePath: string;
	relativeFilePath: string;
	lineNumber: number;
	packageJsonFilePath?: string;
	packageJsonData?: any;
}

/**
 * Рекурсивная функция поиска package.json вверх по директориям
 */
function findPackageJson(currentDir: string): { path: string; dir: string } | null {
	const packageJsonFilePath = path.join(currentDir, 'package.json');

	if (fs.existsSync(packageJsonFilePath)) {
		return { path: packageJsonFilePath, dir: currentDir };
	}

	const parentDir = path.dirname(currentDir);
	// Если дошли до корня диска и не нашли
	if (parentDir === currentDir) {
		return null;
	}

	return findPackageJson(parentDir);
}


/**
 * Функция для генерации ссылки на основе пути к файлу и номера строки и ближайшего package.json.
 */
function generateFileLinkParams(params: Pick<TGenerateFileLinkParams, 'filePath' | 'lineNumber'>): TComputeFileLinkParams {
	const { filePath, lineNumber } = params;

	// Ищем package.json вверх по дереву папок
	const packageJsonInfo = findPackageJson(path.dirname(filePath));

	// Если package.json вообще не найден, фолбэчимся на имя самого файла
	if (!packageJsonInfo) {
		vscode.window.showWarningMessage(
			'Предупреждение: Файл package.json не найден.'
		);

		// Получаем корень текущего открытого проекта (рабочей области)
		const workspaceFolders = vscode.workspace.workspaceFolders;
		let baseDir = '';

		if (workspaceFolders && workspaceFolders.length > 0) {
			// Если открыт проект, берем путь первой (основной) папки
			baseDir = workspaceFolders[0].uri.fsPath;
		} else {
			// Если открыт просто одиночный файл без проекта, берем его директорию
			baseDir = path.dirname(filePath);
		}

		// Вычисляем путь относительно корня проекта и нормализуем слэши
		const relativeFilePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
		return {
			filePath,
			relativeFilePath,
			lineNumber
		};
	}

	// Вычисляем относительный путь от папки с найденным package.json
	const relativeFilePath = path.relative(packageJsonInfo.dir, filePath).replace(/\\/g, '/');

	try {
		const packageJsonFilePath = packageJsonInfo.path;
		const packageJsonRaw = fs.readFileSync(packageJsonFilePath, 'utf8');
		const packageJsonData = JSON.parse(packageJsonRaw);

		return {
			filePath,
			relativeFilePath,
			lineNumber,
			packageJsonFilePath,
			packageJsonData
		};

	} catch (error) {
		// Если случилась любая ошибка (битый JSON, нет прав, нет поля репозитория),
		// выводим предупреждение в VS Code, но НЕ прерываем выполнение функции.
		vscode.window.showWarningMessage(
			`Предупреждение: Не удалось обработать package.json (${(error as Error).message}).`
		);

		// Возвращаем только относительный путь и строку
		return {
			filePath,
			relativeFilePath,
			lineNumber
		};
	}
}

function defaultComputeUrl(params: TComputeFileLinkParams): string {
	const {
		relativeFilePath,
		lineNumber,
		packageJsonData
	} = params;

	let url;
	if (packageJsonData) {
		url = `${packageJsonData.repository?.url}/-/blob/${packageJsonData.version}/${relativeFilePath}#L${lineNumber}`;
	} else {

		url = `/${relativeFilePath}#L${lineNumber}`;
	}

	return url;
}

async function computeUrl(scriptPath: string, params: TComputeFileLinkParams): Promise<string> {
	try {
		// Очищаем кэш Node.js require, чтобы пользователь мог редактировать свой JS-файл без перезапуска VS Code
		delete require.cache[require.resolve(scriptPath)];

		// Динамически импортируем пользовательский модуль
		const userModule = require(scriptPath);

		// Проверяем, экспортирует ли файл нужную нам функцию (например, по умолчанию или с именем handleUrl)
		const handler = userModule.default || userModule;

		if (typeof handler === 'function') {
			// Вызываем функцию пользователя, передавая URL и объект с метаданными (ветка, файл, строка)
			const result = await handler(params);
			return result;
		} else {
			vscode.window.showErrorMessage(`Указанный JS-файл должен экспортировать функцию (module.exports = function...)`);
		}
	} catch (error: any) {
		vscode.window.showErrorMessage(`Ошибка выполнения скрипта: ${error.message}`);
		console.error(error);
	}

	return defaultComputeUrl(params);
}



export function getUserScriptPath(params: Pick<TGenerateFileLinkParams, 'extensionPath'>, createIfNotExists: boolean): string {
	const { extensionPath } = params;

	const defaultScriptPath = path.join(extensionPath, '/scripts/defaultHandler.js').replace(/\\/g, '/');

	const config = vscode.workspace.getConfiguration('getFileLineLink');
	let scriptPath = config.get<string>('customScriptPath')?.replace(/\\/g, '/');

	if (scriptPath) {
		if (fs.existsSync(scriptPath)) {
			vscode.window.showInformationMessage(`Используем скрипт обработки по пользовательскому пути: ${scriptPath}`);
			return scriptPath;
		} else if (createIfNotExists) {
			fs.copyFileSync(defaultScriptPath, scriptPath);
			vscode.window.showInformationMessage(`Создаем и используем скрипт обработки по пользовательскому пути: ${scriptPath}`);
			return scriptPath;
		}
	}



	scriptPath = path.join(extensionPath, '/scripts/userHandler.js').replace(/\\/g, '/');
	if (scriptPath) {
		if (fs.existsSync(scriptPath)) {
			vscode.window.showInformationMessage(`Используем скрипт обработки по пути: ${scriptPath}`);
			return scriptPath;
		} else if (createIfNotExists) {
			fs.copyFileSync(defaultScriptPath, scriptPath);
			vscode.window.showInformationMessage(`Создаем и используем скрипт обработки по пути: ${scriptPath}`);
			return scriptPath;
		}
	}

	scriptPath = defaultScriptPath;
	if (scriptPath && fs.existsSync(scriptPath)) {
		vscode.window.showInformationMessage(`Используем скрипт обработки по умолчанию по пути: ${scriptPath}`);
		return scriptPath;
	}

	return scriptPath;
}

export async function generateFileLink(params: TGenerateFileLinkParams): Promise<string> {
	const { extensionPath, filePath, lineNumber } = params;
	const handlerParams = generateFileLinkParams({
		filePath, lineNumber
	});
	const scriptPath = getUserScriptPath({ extensionPath }, false);
	const url = computeUrl(scriptPath, handlerParams);

	return url;
}
