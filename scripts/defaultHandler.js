/**
* Обработчик по умолчанию для формирвоания урл.
* @param {TComputeFileLinkParams} params - Объект с параметрами для формирования урл.
*/
module.exports = function (params) {
    const {
        filePath,
        relativeFilePath,
        lineNumber,
        packageJsonFilePath,
        packageJsonData
    } = params;

    let url;
    if (packageJsonData) {     
		const repoUrl = getRepoUrl(packageJsonData);
    	const version = getVersionPath(packageJsonData);

        url = `${repoUrl}/-/blob/${version}/${relativeFilePath}#L${lineNumber}`;
    } else {

        url = `/${relativeFilePath}#L${lineNumber}`;
    }

    return url;
};

// Возвращает URL репозитория
function getRepoUrl(packageJson) {
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
    repoUrl = repoUrl.replace(/^git[@\+]/, '').replace(/\.git$/, '');

    repoUrl = repoUrl.replace(':', '/');

    return repoUrl;
}

// Возвращает версию или ветку
function getVersionPath(packageJson) {
    let ver = packageJson.version;
    if (!ver) {
        return 'main';
    }

    ver = ver.replace(/\.0$/, '');
    ver = `rc-${ver}`;

    return ver;
}
