---
title: "MIDPackageUriFactory"
id: "midpackageurifactory"
---

API Name: global.MIDPackageUriFactory

```js
var MIDPackageUriFactory = Class.create();

MIDPackageUriFactory._BASE_MID_PACKAGE_PATH = '/glide/distribution/builds/package/';
MIDPackageUriFactory._LATEST_DIR = 'latest';
MIDPackageUriFactory._SEPARATOR = '/';

MIDPackageUriFactory.prototype = Object.extendsObject(DistDownloadUriFactory, {
	
  initialize: function(midPackage, requestSource) {
    if (!gs.nil(midPackage))
      this.setPackage(midPackage);
	this.setRequestSourceUrl(requestSource);
	this._release_candidate = gs.getProperty('glide.release_candidate', 'false');
  },

  /**
   * Sets the package that this factory will provide URIs for.
   * Required.
   * @param MIDPackage midPackage
   */
  setPackage: function(midPackage) {
    this._midPackage = midPackage;
  },

  /**
   * Retrieves a list of URIs that a package can be downloaded from by order of preference.
   * Requires that the package has been set.
   */
  getUris: function(maxUris) {
    this._setupUriInfo();
    var uris = this.getDownloadUris();
	return uris; 
  },

  /**
   * @param MIDPackage distPackage
   */
  _getDirectoryPath: function(midPackage) {
    var buildstamp = midPackage.getBuildStamp();
    if (JSUtil.nil(buildstamp))
        return midPackage.getName() + MIDPackageUriFactory._SEPARATOR + MIDPackageUriFactory._LATEST_DIR;
    
    var matches = MIDPackage.BUILDSTAMP_REGEX.exec(buildstamp);
    if (matches === null)
      throw new IllegalArgumentException('Invalid buildstamp `' + buildstamp + '`.');

    var path = midPackage.getName()
    + MIDPackageUriFactory._SEPARATOR + matches[3]
    + MIDPackageUriFactory._SEPARATOR + matches[1]
    + MIDPackageUriFactory._SEPARATOR + matches[2];
    return path;
  },

  /**
   * @throws IllegalArgumentException If not factory state is not valid
   */
  _validate: function() {
    if (this._midPackage === null)
      throw new IllegalArgumentException('Package is required.');
  },

  _setupUriInfo: function() {
	this._validate();
	this._fileName = this._midPackage.getFilename();
	// MSI is currently unsigned.  After signing is completed, remove the second portion of this check.
	var is_app_signed = this._release_candidate == 'true' && this._midPackage.getName() != 'mid-windows-installer';
	this._path = MIDPackageUriFactory._BASE_MID_PACKAGE_PATH + (is_app_signed? 'app-signed/' : '') + this._getDirectoryPath(this._midPackage);
  },

  type: 'MIDPackageUriFactory'
});
```