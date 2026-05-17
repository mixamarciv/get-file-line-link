import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Рекурсивная функция поиска package.json вверх по директориям
 */
function findPackageJson(currentDir: string): { path: string; dir: string } | null {
	const packageJsonPath = path.join(currentDir, 'package.json');

	if (fs.existsSync(packageJsonPath)) {
		return { path: packageJsonPath, dir: currentDir };
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
function generateFileLink(currentFilePath: string, lineNumber: number): string {
	// 1. Ищем package.json вверх по дереву папок
	const packageJsonInfo = findPackageJson(path.dirname(currentFilePath));

	// Если package.json вообще не найден, фолбэчимся на имя самого файла
	if (!packageJsonInfo) {
		vscode.window.showWarningMessage(
			'Предупреждение: Файл package.json не найден. Ссылка сформирована относительно корня проекта.'
		);

		// Получаем корень текущего открытого проекта (рабочей области)
		const workspaceFolders = vscode.workspace.workspaceFolders;
		let baseDir = '';

		if (workspaceFolders && workspaceFolders.length > 0) {
			// Если открыт проект, берем путь первой (основной) папки
			baseDir = workspaceFolders[0].uri.fsPath;
		} else {
			// Если открыт просто одиночный файл без проекта, берем его директорию
			baseDir = path.dirname(currentFilePath);
		}

		// Вычисляем путь относительно корня проекта и нормализуем слэши
		const projectRelativePath = path.relative(baseDir, currentFilePath).replace(/\\/g, '/');
		return `/${projectRelativePath}#L${lineNumber}`;
	}

	// Вычисляем относительный путь от папки с найденным package.json
	const relativeFilePath = path.relative(packageJsonInfo.dir, currentFilePath).replace(/\\/g, '/');

	try {
		// 2. Читаем и парсим файл конфигурации
		const packageJsonRaw = fs.readFileSync(packageJsonInfo.path, 'utf8');
		const packageJson = JSON.parse(packageJsonRaw);

		// 3. Извлекаем URL репозитория
		const repoUrl = getRepoUrl(packageJson);

		// 4. Извлекаем версию или ветку
		const version = getVersionPath(packageJson);

		// 5. Возвращаем полную ссылку, если всё прошло успешно
		return `${repoUrl}/-/blob/${version}/${relativeFilePath}#L${lineNumber}`;

	} catch (error) {
		// Если случилась любая ошибка (битый JSON, нет прав, нет поля репозитория),
		// выводим предупреждение в VS Code, но НЕ прерываем выполнение функции.
		vscode.window.showWarningMessage(
			`Предупреждение: Не удалось обработать package.json (${(error as Error).message}). Ссылка сформирована без префиксов.`
		);

		// Возвращаем только относительный путь и строку
		return `/${relativeFilePath}#L${lineNumber}`;
	}
}

function getRepoUrl(packageJson: any): string {
	let repoUrl = '';
	if (typeof packageJson.repository === 'string') {
		repoUrl = packageJson.repository;
	} else if (packageJson.repository?.url) {
		repoUrl = packageJson.repository.url;
	}

	if (!repoUrl) {
		throw new Error('В package.json не указано поле repository.url');
	}

	// Очищаем URL от git-префиксов и суффиксов
	repoUrl = repoUrl.replace(/^git@/, '').replace(/^git\+/, '').replace(/\.git$/, '');

	repoUrl = repoUrl.replace(':', '/');

	return repoUrl;
}


function getVersionPath(packageJson: any): string {
	let ver = packageJson.version;
	if (!ver) {
		return 'main';
	}

	ver = ver.replace(/\.0$/, '');
	ver = `rc-${ver}`;

	return ver;
}

/**
 * Основной обработчик клика по пункту меню
 */
async function handleContextMenuClick(): Promise<void> {
	const editor = vscode.window.activeTextEditor;
	// Получаем активный текстовый редактор
	if (!editor) {
		vscode.window.showWarningMessage('Нет активного редактора');
		return;
	}

	const position = editor.selection.active;
	const lineNumber = position.line + 1; // Переводим 0-индекс VS Code в человеческий номер строки
	const currentFilePath = editor.document.uri.fsPath;

	// Формируем ссылку на файл
	const fileLink = generateFileLink(currentFilePath, lineNumber);


	// Копируем результат в буфер обмена
	await vscode.env.clipboard.writeText(fileLink);

	vscode.window.showInformationMessage(`Ссылка скопирована: ${fileLink}`);

}

export function activate(context: vscode.ExtensionContext) {
	// Регистрируем команду, указанную в package.json
	let disposable = vscode.commands.registerCommand('get-file-line-link.processLine', handleContextMenuClick);

	context.subscriptions.push(disposable);
}

export function deactivate() { }