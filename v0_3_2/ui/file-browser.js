/* ================= FILE BROWSER ================= */

let fileActive = null;
let confirm = false;
let yesId = 1;
let pendingSaveIsDir = false;

function locationChanged() {
  let dirPath = document.getElementById('dirpath');
  let dirExit = document.getElementById('direxit');

  dirPath.textContent = currentFilesLocation.replaceAll('>', '\\');

  if (currentFilesLocation === '>') {
    dirExit.disabled = 1;
  } else {
    dirExit.disabled = 0;
  }
}

function clearFileActionButtons() {
  document.getElementById('filedirdelete').disabled = 1;
  document.getElementById('fileload').disabled = 1;
  document.getElementById('fileupdate').disabled = 1;
  document.getElementById('direnter').disabled = 1;
}

function purgeLegacyFileStorage() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === 'prog/filelist' || key === 'prog/nextEmptyFileRef' || key.startsWith('prog/fileRef')) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    sdb.del(key);
  }
}

function addDirIfNot(name, location) {
  if (!fss.existsName(name, location)) {
    fss.addDir(name, location);
  }
}

function addFileIfNot(name, location, content) {
  if (!fss.existsName(name, location)) {
    fss.addFile(name, location, content);
  }
}

function removeFileIfExist(name, location) {
  if (fss.existsName(name, location)) {
    fss.removeFile(name, location);
  }
}

function cdDir(dir, location) {
  return fss.getDirLocation(dir, location);
}

function initFiles() {
  purgeLegacyFileStorage();

  let loc = '>';
  addDirIfNot('lib', loc);
  loc = cdDir('lib', loc);
  addFileIfNot('@' + 'first', loc, code.value);
  let filesInLib = 0;
  for (k in lib_files) {
    filesInLib++;
    addFileIfNot('@' + k, loc, lib_files[k]);
  }
  console.log(filesInLib + ' LibFiles');
}

function removeInitFiles() {
  let loc = '>';
  addDirIfNot('lib', loc);
  loc = cdDir('lib', loc);
  removeFileIfExist('@' + 'first', loc);
  for (k in lib_files) {
    removeFileIfExist('@' + k, loc);
  }
}

function btnfileUpdate() {
  if (fileActive === null) {
    return;
  }
  if (!confirm) {
    showConfirm(0);
    return;
  }
  confirm = false;
  if (fileActive.className !== 'file') {
    return;
  }
  const fileName = fileActive.textContent;
  fss.updateFile(fileName, currentFilesLocation, code.value);

  sdb.set("prog/lastName", fileName);
  updateFileNameDisplay(fileName);

  fileActive.style = '';
  fileActive = null;
  showFiles();
}

function btnfileSave(isDir) {
  let elName = document.getElementById("filename");
  let elSave = document.getElementById("filesave");
  let dirSave = document.getElementById("dirsave");

  let name = filename.value.trim();
  if (name.length == 0) {
    filename.value = "";
    elSave.disabled = 1;
    dirSave.disabled = 1;
    return;
  }

  nameIsValid(name, isDir);

  if (!confirm) {
    pendingSaveIsDir = !!isDir;
    showConfirm(1);
    return;
  }
  confirm = false;
  fFilenameCheck(name);

  if (isDir) {
    fss.addDir(name, currentFilesLocation);
  } else {
    fss.addFile(name, currentFilesLocation, code.value);
    sdb.set("prog/lastName", name);
    updateFileNameDisplay(name);
  }

  elName.value = "";
  elSave.disabled = 1;
  dirSave.disabled = 1;
  showFiles();
}

function saveDb(prog, fileName = null) {
  sdb.set("prog/last", prog);
  sdb.set("prog/lastHash", getHashForStr(prog));
  if (fileName !== null) {
    sdb.set("prog/lastName", fileName);
    updateFileNameDisplay(fileName);
  }
  if (typeof persistTabs === 'function') {
    persistTabs();
  }
}

function updateFileNameDisplay(fileName) {
  const fileNameEl = document.getElementById("fileName");
  if (fileNameEl) {
    fileNameEl.textContent = fileName || "";
  }
}

function fFilenameCheck(name) {
  if (fss.existsName(name, currentFilesLocation)) {
    throw Error(name + ' already exists!');
  }
}

function btndirExit() {
  currentFilesLocation = fss.getUpDirLocation(currentFilesLocation);
  locationChanged();
  showFiles();
}

function btndirEnter() {
  if (fileActive === null) {
    return;
  }

  if (fileActive.className !== 'dir') {
    return;
  }
  currentFilesLocation = fss.getDirLocation(fileActive.textContent, currentFilesLocation);
  locationChanged();
  fileActive = null;
  showFiles();
}

function btnfileLoad() {
  if (!fileActive) {
    return;
  }
  if (!confirm) {
    showConfirm(-2);
    return;
  }
  confirm = false;
  if (fileActive.className !== 'file') {
    return;
  }

  const fileName = fileActive.textContent;
  codeCheckDisabled = true;
  code.value = fss.getFileContent(fileName, currentFilesLocation);
  codeCheckDisabled = false;

  sdb.set("prog/lastName", fileName);
  updateFileNameDisplay(fileName);

  fileActive.style = '';
  fileActive = null;
  clearFileActionButtons();
  tabSave(true);
  fShowTabs();
  persistTabs();
}

function fileClick(e) {
  let filedirdelete = document.getElementById("filedirdelete");
  let dirEnter = document.getElementById('direnter');
  let fileLoad = document.getElementById('fileload');
  let fileUpdate = document.getElementById('fileupdate');

  if (fileActive === e) {
    fileActive.style = "";
    fileActive = null;
    clearFileActionButtons();
    return;
  }
  if (fileActive !== null) {
    fileActive.style = "";
  }
  fileActive = e;
  e.style = "color: red";
  filedirdelete.disabled = 0;
  if (fileActive.className === 'file') {
    fileLoad.disabled = 0;
    fileUpdate.disabled = 0;
  } else {
    fileLoad.disabled = 1;
    fileUpdate.disabled = 1;
  }
  if (fileActive.className === 'dir') {
    dirEnter.disabled = 0;
  } else {
    dirEnter.disabled = 1;
  }
}

function btnresetLib() {
  if (fileActive !== null) {
    return;
  }
  if (!confirm) {
    showConfirm(-3);
    return;
  }
  confirm = false;
  removeInitFiles();
  initFiles();
  showFiles();
}

function showConfirm(forId) {
  const elConfirm = document.getElementById('confirm');
  elConfirm.style = 'display:block';
  yesId = forId;
}

function yes() {
  confirm = true;
  const elConfirm = document.getElementById('confirm');
  elConfirm.style = 'display:none';
  if (yesId === -1) {
    btnfiledirDelete();
  } else if (yesId === 0) {
    btnfileUpdate();
  } else if (yesId === 1) {
    btnfileSave(pendingSaveIsDir);
  } else if (yesId === 2) {
    btnClr();
  } else if (yesId === -2) {
    btnfileLoad();
  } else if (yesId === -3) {
    btnresetLib();
  }
  confirm = false;
}

function no() {
  const elConfirm = document.getElementById('confirm');
  elConfirm.style = 'display:none';
  confirm = false;
}

function btnfiledirDelete() {
  if (fileActive === null) {
    return;
  }
  if (!confirm) {
    showConfirm(-1);
    return;
  }
  confirm = false;
  if (fileActive.className == 'dir') {
    fss.removeDir(fileActive.textContent, currentFilesLocation);
  } else if (fileActive.className == 'file') {
    fss.removeFile(fileActive.textContent, currentFilesLocation);
  }
  fileActive = null;
  showFiles();
  clearFileActionButtons();
}

function showFiles() {
  document.getElementById("filelist").innerHTML = "";
  let currentFiles = fss.getFiles(currentFilesLocation);
  let elList = document.getElementById("filelist");

  currentFiles.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'dir' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  for (let i = 0; i < currentFiles.length; i++) {
    let file = currentFiles[i];
    if (file.type === 'file') {
      continue;
    }
    elList.innerHTML += '<div class="dir" onclick="fileClick(this)">' + file.name + '</div>';
  }
  for (let i = 0; i < currentFiles.length; i++) {
    let file = currentFiles[i];
    if (file.type === 'dir') {
      continue;
    }
    elList.innerHTML += '<div class="file" onclick="fileClick(this)">' + file.name + '</div>';
  }
}
