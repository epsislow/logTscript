/* ================= FILE BROWSER ================= */

let fileActive = null;

function locationChanged() {
  let dirPath = document.getElementById('dirpath');
  let dirExit = document.getElementById('direxit');
  
  dirPath.textContent = currentFilesLocation.replaceAll('>', '\\');
  
  if(currentFilesLocation === '>') {
    dirExit.disabled = 1;
  } else {
    dirExit.disabled = 0;
  }
}

function addDirIfNot(name, location) {
  if(!fss.existsName(name, location)) {
    fss.addDir(name, location);
  }
}

function addFileIfNot(name, location, content) {
  if(!fss.existsName(name, location)) {
    fss.addFile(name, location, content);
  }
}

function removeDirIfEmpty(name) {
  if (fss.existsName(name, location)) {
    fss.removeDir(name, location);
  }
}

function removeFileIfExist(name, location) {
  if(fss.existsName(name, location)) {
    fss.removeFile(name, location);
  }
}

function cdDir(dir, location) {
  return fss.getDirLocation(dir, location);
}

function cdUp(location) {
  return fss.getUpDirLocation(location);
}

function initFiles() {
  let loc = '>';
  addDirIfNot('lib', loc);
  loc = cdDir('lib', loc);
  addFileIfNot('@' + 'first', loc, code.value);
  let filesInLib = 0;
  for(k in lib_files) {
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
  for(k in lib_files) {
    removeFileIfExist('@' + k, loc);
  }
}

function initDevices() {
  
}

function btnfileUpdate() {
  if(fileActive === null) {
    return;
  }
  if(!confirm) {
    showConfirm(0);
    return;
  }
  confirm = false;
  if(fileActive.className !== 'file') {
    return;
  }
  const fileName = fileActive.textContent;
  fss.updateFile(fileName, currentFilesLocation, code.value);
  
  sdb.set("prog/lastName", fileName);
  updateFileNameDisplay(fileName);
  
  fileActive.style ='';
  fileActive=null;
  fShowFiles();
}

function btnfileSave(isDir) {
  let elName = document.getElementById("filename");
  let elSave = document.getElementById("filesave");
  let dirSave = document.getElementById("dirsave");
  
  let name = filename.value.trim();
  if(name.length == 0) {
    filename.value = "";
    elSave.disabled= 0;
    return;
  }
  
  nameIsValid(name, isDir);
  
  if(!confirm) {
    showConfirm(1);
    return;
  }
  confirm = false;
  fFilenameCheck(name);
  
  if(isDir) {
    fss.addDir(name, currentFilesLocation);
  } else {
    fss.addFile(name, currentFilesLocation, code.value);
    sdb.set("prog/lastName", name);
    updateFileNameDisplay(name);
  }
  
  elName.value = "";
  elSave.disabled = 1;
  dirSave.disabled = 1;
  fShowFiles();
}

function saveDb(prog, fileName = null) {
  sdb.set("prog/last", prog);
  sdb.set("prog/lastHash", getHashForStr(prog));
  if(fileName !== null) {
    sdb.set("prog/lastName", fileName);
    updateFileNameDisplay(fileName);
  }
}

function updateFileNameDisplay(fileName) {
  const fileNameEl = document.getElementById("fileName");
  if(fileNameEl) {
    fileNameEl.textContent = fileName || "";
  }
}

function fFilenameCheck(name) {
  if(fss.existsName(name, currentFilesLocation)) {
    throw Error(name + ' already exists!');
  }
}

function filenameCheck(fileStrArr) {
  let elName = document.getElementById("filename");
  
  if(filename.value.trim().length == 0) {
    filename.value = "";
    elSave.disabled= 0;
    return;
  }
  for(let i=0; i< fileStrArr.length; i++) {
    let fileStr = fileStrArr[i];
    let fileInfo = fileStr.split(",");
    let file = {
      name: fileInfo[0],
      type: fileInfo[1],
      ref: fileInfo[2],
      location: fileInfo[3]
    }
    if (file.location !== currentFilesLocation) {
      continue;
    }
    if(file.name === filename.value) {
      throw Error(filename.value + " already exists in this location");
    }
  }
}

function btndirExit() {
  currentFilesLocation = fss.getUpDirLocation(currentFilesLocation);
  locationChanged();
  fShowFiles();
}

function dirExit() {
  if(currentFilesLocation === '>') {
    return;
  }
  let dirs = currentFilesLocation.split('>');
  if(dirs.length > 1) {
    currentFilesLocation = dirs.slice(0, -2).join('>') + '>';
  }
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
  fShowFiles();
}

function dirEnter() {
  if (fileActive === null) {
    return;
  }
  
  if( fileActive.className !=='dir') {
    return;
  }
  currentFilesLocation = currentFilesLocation + fileActive.textContent + '>';
  locationChanged();
  fileActive = null;
  showFiles();
}

function btnfileLoad() {
  if(!fileActive) {
    return;
  }
  if(!confirm) {
    showConfirm(-2);
    return;
  }
  confirm = false;
  if(fileActive.className !=='file') {
    return;
  }
  let fileLoad = document.getElementById('fileload');
  
  const fileName = fileActive.textContent;
  codeCheckDisabled = true;
  code.value = fss.getFileContent(fileName, currentFilesLocation);
  codeCheckDisabled = false;
  
  sdb.set("prog/lastName", fileName);
  updateFileNameDisplay(fileName);

  fileActive.style ='';
  fileActive = null;
  fileLoad.disabled=1;
  tabSave(true);
  fShowTabs();
}

function fileLoad() {
  if(!fileActive) {
    return;
  }
 
  let filelistStr = sdb.get("prog/filelist");
  let fileStrArr = [];
  if(filelistStr) {
    fileStrArr = filelistStr.split("|");
  }
  for (let i = 0; i < fileStrArr.length; i++) {
  let fileStr = fileStrArr[i];
  let fileInfo = fileStr.split(",");
  let file = {
    name: fileInfo[0],
    type: fileInfo[1],
    ref: fileInfo[2],
    location: fileInfo[3]
  }
  if (file.location === currentFilesLocation && file.name != fileActive.textContent) {
    continue;
  }
  if(sdb.has('prog/fileRef'+ file.ref)) {
    let codeLoad = sdb.get('prog/fileRef'+ file.ref);
    code.value = codeLoad;
  }
}

 fileActive.style = "";
 fileActive = null;
 filedirdelete.disabled = 1
 dirEnter.disabled = 1;
 fileLoad.disabled = 1;
}

function fileClick(e) {
  let filedirdelete = document.getElementById("filedirdelete");
  let dirEnter = document.getElementById('direnter');
  let fileLoad = document.getElementById('fileload');
  let fileUpdate = document.getElementById('fileupdate');
  
  if( fileActive === e) {
    fileActive.style = "";
    fileActive =null;
    filedirdelete.disabled = 1
    dirEnter.disabled = 1;
    fileLoad.disabled = 1;
    return;
  }
  if( fileActive !== null) {
    fileActive.style = "";
  }
  fileActive = e;
  e.style ="color: red";
  filedirdelete.disabled = 0;
  if(fileActive.className === 'file') {
    fileLoad.disabled = 0;
    fileUpdate.disabled = 0;
  } else {
    fileLoad.disabled = 1;
    fileUpdate.disabled = 1;
  }
  if(fileActive.className === 'dir') {
    dirEnter.disabled = 0;
  } else {
    dirEnter.disabled = 1;
  }
}

function dirIsEmptyCheck(fileStrArr){
  let location = currentFilesLocation + fileActive.textContent + '>';
for (let i = 0; i < fileStrArr.length; i++) {
  let fileStr = fileStrArr[i];
  let fileInfo = fileStr.split(",");
  let file = {
    name: fileInfo[0],
    type: fileInfo[1],
    ref: fileInfo[2],
    location: fileInfo[3]
  }
  if (file.location === location) {
    throw Error("Directory not empty! "+ file.name + " in directory");
  }
}

}

function btnresetLib() {
  if(fileActive !== null) {
    return;
  }
  if(!confirm) {
    showConfirm(-3);
    return;
  }
  confirm = false;
  removeInitFiles();
  initFiles();
}

let confirm = false;
let yesId= 1;

function showConfirm(forId) {
  const elConfirm = document.getElementById('confirm');
  elConfirm.style='display:block';
  yesId = forId;
}

function yes() {
  confirm = true;
  const elConfirm = document.getElementById('confirm');
  elConfirm.style = 'display:none';
  if(yesId=== -1) {
    btnfiledirDelete();
  } else if (yesId === 0) {
    btnfileUpdate();
  } else if (yesId === 1) {
    btnfileSave();
  } else if (yesId === 2) {
    btnClr();
  } else if (yesId === -2) {
    btnfileLoad();
  } else if (yesId === -3) {
    btnresetLib();
  }
  confirm= false;
}

function no() {
  const elConfirm = document.getElementById('confirm');
  elConfirm.style='display:none';
  confirm = false;
}

function btnfiledirDelete() {
  if(fileActive === null) {
    return;
  }
  if(!confirm) {
    showConfirm(-1);
    return;
  }
  confirm = false;
  if(fileActive.className == 'dir') {
    fss.removeDir(fileActive.textContent, currentFilesLocation);
  } else if (fileActive.className == 'file') {
    fss.removeFile(fileActive.textContent, currentFilesLocation);
  }
  fShowFiles();
  let filedirdelete = document.getElementById('filedirdelete');
  filedirdelete.disabled = 1;
  let fileload = document.getElementById('fileload');
  fileload.disabled = 1;
}

function filedirDelete() {
  if(fileActive === null) {
    return;
  }
  let filelistStr = sdb.get("prog/filelist");
  let nextEmptyFileRef = parseInt(sdb.get("prog/nextEmptyFileRef", "0"), 10);
  
  let fileStrArr = [];
  if(filelistStr) {
    fileStrArr = filelistStr.split("|");
  }
  
  dirIsEmptyCheck(fileStrArr);

  let newFileStrArr = [];
  for (let i = 0; i < fileStrArr.length; i++) {
  let fileStr = fileStrArr[i];
  let fileInfo = fileStr.split(",");
  let file = {
    name: fileInfo[0],
    type: fileInfo[1],
    ref: fileInfo[2],
    location: fileInfo[3]
  }
  if (file.location === currentFilesLocation && file.name == fileActive.textContent) {
    continue;
  }
  newFileStrArr[newFileStrArr.length] = fileStr;
}
  sdb.set("prog/filelist", newFileStrArr.join("|"));
  showFiles();
    let filedirdelete = document.getElementById('filedirdelete');
  filedirdelete.disabled = 1;
    let fileload = document.getElementById('fileload');
  fileload.disabled = 1;
}

function fileSave(isDir) {
  let elName = document.getElementById("filename");
  let elSave = document.getElementById("filesave");
  let dirSave = document.getElementById("dirsave");
  
  if(filename.value.trim().length == 0) {
    filename.value = "";
    elSave.disabled= 0;
    return;
  }
  
  let filelistStr = sdb.get("prog/filelist");
  let nextEmptyFileRef = parseInt(sdb.get("prog/nextEmptyFileRef", "0"), 10);
  
  let fileStrArr = [];
  if(filelistStr) {
    fileStrArr = filelistStr.split("|");
  }
  filenameCheck(fileStrArr);
  
  fileStrArr[fileStrArr.length] = [
    filename.value,
    isDir ?"dir":"file",
    isDir? 0: nextEmptyFileRef,
    currentFilesLocation,
  ];
  
  if( !isDir) {
    sdb.set("prog/nextEmptyFileRef", nextEmptyFileRef + 1);
    sdb.set("prog/fileRef" + nextEmptyFileRef, code.value);
  }
  sdb.set("prog/filelist", fileStrArr.join("|"));
  
  elName.value = "";
  elSave.disabled =1;
  dirSave.disabled = 1;
  showFiles();
}

function fShowFiles() {
  document.getElementById("filelist").innerHTML="";
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
  elList.innerHTML += '<div class="dir" onclick="fileClick(this)">' + file.name + '<div>';
}
for (let i = 0; i < currentFiles.length; i++) {
  let file = currentFiles[i];
  if (file.type === 'dir') {
    continue;
  }
    elList.innerHTML += '<div class="file" onclick="fileClick(this)">' + file.name + '<div>';
}

}

function showFiles() {
  document.getElementById("filelist").innerHTML="";
  if(!sdb.has('prog/filelist')) {
    return;
  }
  let filelistStr = sdb.get("prog/filelist");
  let files = [];
  let currentFiles = [];
  let fileStrArr = filelistStr.split("|");
  for(let i=0; i< fileStrArr.length; i++) {
    let fileStr = fileStrArr[i];
    let fileInfo = fileStr.split(",");
    
    files[files.length] = {
      name: fileInfo[0],
      type: fileInfo[1],
      ref: fileInfo[2],
      location: fileInfo[3]
    }
  }
  let locSeparator = '>';
  
  let locationFiles = [];
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    if (file.location !== currentFilesLocation) {
      continue;
    }
    if(file.type !== "dir") {
      continue;
    }
    currentFiles[currentFiles.length] = file;
  }
  
  for(let i=0; i< files.length; i++) {
     let file = files[i];
     if(file.location !== currentFilesLocation) {
       continue;
     }
     if(file.type !== "file") {
       continue;
     }
     currentFiles[currentFiles.length] = file;
  }
  
  let elList = document.getElementById("filelist");
  for(let i=0; i< currentFiles.length; i++) {
    let file = currentFiles[i];
    if(file.type === 'file') {
      elList.innerHTML += '<div class="file" onclick="fileClick(this)">'+ file.name +'<div>';
    } else if(file.type === 'dir') {
      elList.innerHTML += '<div class="dir" onclick="fileClick(this)">'+ file.name +'<div>';
    }
  } 
}
