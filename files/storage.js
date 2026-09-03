/* ================= FILE STORAGE ================= */

class DbLocalStorage {
  constructor(){
    this.db = window.localStorage
  }
  get(name, defaul) {
    return (
      this.has(name) ?
      window.localStorage.getItem(name)
      : defaul
    );
  }
  has(name) {
    return window.localStorage.getItem(name) !== null;
  }
  set(name, value) {
    return window.localStorage.setItem(name, value);
  }
  del(name) {
    return window.localStorage.removeItem(name);
  }
}

class FileStorageSystem {
  constructor(dbStorage) {
    this.st = dbStorage;
    this.prefix = 'prog2';
    this.dirPrefix = '';
    this.dirSeparator = '>';
    this.dirSuffix = '>';
  }
  setPrefix(prefix) {
    this.prefix = prefix;
  }
  getPrefix() {
    return this.prefix;
  }
  
  getDirLocation(name, location) {
    if(location === this.dirSuffix) {
      return this.dirPrefix + name + this.dirSuffix;
    }
    let mid = location.slice(this.dirPrefix.length, -this.dirSuffix.length);
    
    return this.dirPrefix 
      + mid
      + this.dirSeparator 
      + name 
      + this.dirSuffix;
  }
  
  getUpDirLocation(location) {
    if(location === this.dirSuffix) {
      return this.dirSuffix;
    }
    let mid = location.slice(this.dirPrefix.length, -this.dirSuffix.length);
    let lastSepIndex = location.lastIndexOf(this.dirSeparator);
    if(lastSepIndex === -1) {
      return this.dirSuffix;
    }

    let parts = mid.split(this.dirSeparator);
    parts.pop(); 
    return this.dirPrefix + parts.join(this.dirSeparator) + this.dirSuffix;
  }

  getIdFilelist(location) {
    return this.prefix + '.list.' + location;
  }
  getIdFileRef(ref) {
    return this.prefix + '.ref.' + ref;
  }
  
  getIdNextRef() {
    return this.prefix + '.nextRef';
  }
  
  _getNextRef() {
    return parseInt(this.st.get(this.getIdNextRef(), '0'), 10);
  }
  _incNextRef() {
    return this._getNextRef() + 1;
  }
  
  _writeNextRef(value) {
    this.st.set(this.getIdNextRef(), value);
  }
  
  _writeFileList(value, location) {
    this.st.set(this.getIdFilelist(location), value);
  }
  
  _getFilesStr(location) {
    let filelistStr = this.st.get(this.getIdFilelist(location),-1);
    if(filelistStr === -1 || filelistStr === '') {
      return [];
    }
    return filelistStr.split('|');
  }
  
  _getFiles(location) {
    let fileStrArr = this._getFilesStr(location);
    let files = [];
    for(let i=0; i< fileStrArr.length; i++) {
      let fileStr = fileStrArr[i];
      let fileInfo = fileStr.split(",");
      let file = {
        name: fileInfo[0],
        type: fileInfo[1],
        ref: fileInfo[2]
      }
      files[files.length] = file;
    }
    return files;
  }
  
  _getFileInfo(name, location) {
    let fileStrArr = this._getFilesStr(location);
    for(let i=0; i< fileStrArr.length; i++) {
      let fileStr = fileStrArr[i];
      let fileInfo = fileStr.split(',');
      if(name === fileInfo[0]) {
        return {
          name: fileInfo[0],
          type: fileInfo[1],
          ref: fileInfo[2],
        };
      }
    }
    return {name: -1, type: -1, ref: -1};
  }
  
  _existsName(name, location) {
    let fileInfo = this._getFileInfo(name, location);
    return (fileInfo.name !== -1);
  }
  
  _isEmptyDir(location) {
    let fileStrArr = this._getFilesStr(location);
    return fileStrArr.length === 0;
  }
  
  _getFileRef(name, location) {
    let fileInfo = this._getFileInfo(name, location);
    return fileInfo.ref;
  }
  
  _add(name, location, type, content) {
    let fileStrArr = this._getFilesStr(location);
    let nextRef = this._incNextRef();

    fileStrArr[fileStrArr.length] = [
      name, type, nextRef
    ].join(',');
    
    this._writeNextRef(nextRef);
    if(type === 'file') {
      this._addStorageRef(nextRef, content);
    }
    this._writeFileList(fileStrArr.join('|'), location);
  }
  
  _update(name, location, content) {
    let fileRef = this._getFileRef(name, location);
    if(fileRef===-1) {
      throw Error(`file ${name} not found in ${location}!`);
    }
    this._addStorageRef(fileRef, content);
  }
  
  _addStorageRef(fileRef, value) {
    this.st.set(this.getIdFileRef(fileRef), value);
  }
  
  _removeFileList(location) {
    this.st.del(this.getIdFilelist(location));
  }
  _removeStorageRef(fileRef) {
    this.st.del(this.getIdFileRef(fileRef));
  }
  
  _remove(name, location, type) {
    let fileStrArr = this._getFilesStr(location);
    let newFileStr = '';

    let foundFileInfo = {name: -1, type: -1, ref: -1};
    for (let i = 0; i < fileStrArr.length; i++) {
      let fileStr = fileStrArr[i];
      let fileInfo = fileStr.split(",");
      if (fileInfo[0] === name) {
        foundFileInfo = {
          name: fileInfo[0],
          type: fileInfo[1],
          ref: fileInfo[2]
        }
        continue;
      }
    
      newFileStr += (newFileStr.length ? '|':'') + fileStr;
    }
    if (foundFileInfo.name === -1) {
      throw Error(name + ' not found in location ' + location);
    }
    
    if(foundFileInfo.type === 'dir') {
      let namedLocation = this.getDirLocation(name, location);
      if(!this._isEmptyDir(namedLocation)) {
        throw Error(name + ' id not empty!');
      }
      if(newFileStr === '') {
        this._removeFileList(location);
      } else {
         this._writeFileList(newFileStr, location);
      }
      this._removeFileList(namedLocation);
    }
    if(foundFileInfo.type === 'file') {
      if(newFileStr === '') {
        this._removeFileList(location);
      } else {
        this._writeFileList(newFileStr, location);
      }
      this._removeStorageRef(foundFileInfo.ref);
    }
  }
  
  getFileContent(name, location) {
    let fileRef = this._getFileRef(name, location);
    return this.st.get(this.getIdFileRef(fileRef));
  }
  
  getFiles(location) {
    return this._getFiles(location);
  }
  addFile(name, location, content) {
    this._add(name, location, 'file', content);
  }
  addDir(name, location) {
    this._add(name, location, 'dir', -1);
  }
  updateFile(name, location, content) {
    this._update(name, location, content);
  }
  removeFile(name, location) {
     this._remove(name, location, 'file');
  }
  removeDir(name, location) {
    this._remove(name, location, 'dir');
  }
  isEmptyDir(location) {
    return this._isEmptyDir(location);
  }

  existsName(name, location) {
    return this._existsName(name, location);
  }
}
