import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { generateFileLink, getUserScriptPath } from './generateFileLink';

/**
 * Основной обработчик клика по пункту меню
 */
async function handleContextMenuClick(context: vscode.ExtensionContext): Promise<void> {
	const editor = vscode.window.activeTextEditor;
	// Получаем активный текстовый редактор
	if (!editor) {
		vscode.window.showWarningMessage('Нет активного редактора');
		return;
	}

	const position = editor.selection.active;
	const lineNumber = position.line + 1; // Переводим 0-индекс VS Code в человеческий номер строки
	const filePath = editor.document.uri.fsPath;
	const extensionPath = context.extensionPath;

	// Формируем ссылку на файл
	const fileLink = await generateFileLink({ filePath, lineNumber, extensionPath });


	// Копируем результат в буфер обмена
	await vscode.env.clipboard.writeText(fileLink);

	vscode.window.showInformationMessage(`Ссылка скопирована: ${fileLink}`);

}

export function activate(context: vscode.ExtensionContext) {
	// Регистрируем команду, указанную в package.json для копирования ссылки
	let processLineCmd = vscode.commands.registerCommand('get-file-line-link.processLine', () => handleContextMenuClick(context));

	// Регистрация команды, вызываемой по ссылке из настроек
	let openScriptCmd = vscode.commands.registerCommand('getFileLineLink.openCustomScript', async () => {
		const scriptPath = getUserScriptPath({ extensionPath: context.extensionPath }, true);

		try {
			const doc = await vscode.workspace.openTextDocument(scriptPath);
			await vscode.window.showTextDocument(doc);
		} catch (error: any) {
			vscode.window.showErrorMessage(`Не удалось открыть файл: ${error.message}`);
		}
	});

	context.subscriptions.push(processLineCmd, openScriptCmd);
}

export function deactivate() { }