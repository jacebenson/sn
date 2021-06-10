---
title: "DistDownloadUriFactory"
id: "distdownloadurifactory"
---

API Name: global.DistDownloadUriFactory

```js
/**
 * Factory to decide the proper urls for downloading a file based on 'mid.download.through.instance'
 * property.
 * If this property is set to true, all downloads using this factory uses instance to download the file
 * from the install server. Based on the source of the request for the download it uses one of the following
 * uri formats to download
 * /api/now/dist_download_proxy/manual_download_through_attachment/{FILENAME}?sysparm_payload_type=distribution_download&sysparm_route_path={FILE PATH ON THE SERVER}
 * /api/now/dist_download_proxy/manual_download_to_attachment/{FILENAME}?sysparm_payload_type=distribution_download&sysparm_route_path={FILE PATH ON THE SERVER}
 * or
 * /api/now/dist_download_proxy/auto_download_through_attachment/{FILENAME}?sysparm_payload_type=distribution_download&sysparm_route_path={FILE PATH ON THE SERVER}
 *
 * 
 * auto_download_through_attachment uses INT Semaphores. There is a limitation, specified by
 * concurrent.dist.download property, on the number of concurrent downloads. However, manual_download
 * uses default semaphores and there is no limitation on the concurrent downloads.
 * The manual_download_to_attachment downloads in the instance as an attachment and returns the sys_id of
 * the attachment, but the manual_download_through_attachment downloads the file as an attachment and
 * streams out the file.
 * 
 * Note: The protocol and host name has to be added to these urls based on how the client is connected
 * to the instance. For example the MID Server to upgrade uses this factory and before open the http
 * connection, it adds the url instance at the begining of this url. 
 *
 * If 'mid.download.through.instance' property is set to fasle all clients using this factory will be connected
 * to the download server directly through the following uri format
 * http(s)://install.service-now.com/{FILE PATH ON THE SERVRE}/{FILENAME}
 **/

var DistDownloadUriFactory = Class.create();
DistDownloadUriFactory._DOWNLOAD_THROUGH_INSTANCE_BASE_URL = '/api/now/dist_download_proxy';
DistDownloadUriFactory._MANUAL_DOWNLOAD_URL = 'manual_download_through_attachment';
DistDownloadUriFactory._MANUAL_DOWNLOAD_TO_ATTACHMENT_URL = 'manual_download_to_attachment';
DistDownloadUriFactory._AUTO_DOWNLOAD_URL = 'auto_download_through_attachment';
DistDownloadUriFactory._BASE_DIRECT_DOWNLOAD_HTTPS_URI = 'https://install.service-now.com';
DistDownloadUriFactory._BASE_DIRECT_DOWNLOAD_HTTP_URI = 'http://install.service-now.com';
DistDownloadUriFactory._SEPARATOR = '/';

DistDownloadUriFactory.prototype = {
	//requestSource is optional.
	initialize: function(fileName, path, requestSource) {
		if (!fileName || !path) 
			throw new IllegalArgumentException('Name of the file and its path is required');
		this._fileName = fileName;
		this._path = path;
		this._midSysId = null; 
		this.setRequestSourceUrl(requestSource);
		
	},

	setRequestSourceUrl: function(reqSource) {
		this._requestSourceUrl = DistDownloadUriFactory._MANUAL_DOWNLOAD_URL;
		if (reqSource == 'attachment_download')
			this._requestSourceUrl = DistDownloadUriFactory._MANUAL_DOWNLOAD_TO_ATTACHMENT_URL;
		if (reqSource == 'auto_upgrade')
			this._requestSourceUrl = DistDownloadUriFactory._AUTO_DOWNLOAD_URL;
	},

	setMidSysId: function(midSysId){
		this._midSysId = midSysId;
	},

	/**
	 * Return the proper uris based on the 'mid.download.through.instance' property
	 **/
	getDownloadUris: function(){

		if (gs.getProperty('mid.download.through.instance', 'false') == 'false')
			return this._getDirectDownloadUris();

		var uris = [];
		// The request is for manual download, no MID Sever is available.
		// The download can be done through the instance
		if (!this._midSysId) {
			// Request from a MID Server to refresh its Package information
			// but its record was not created on the instance yet.
			if (this._requestSourceUrl == DistDownloadUriFactory._AUTO_DOWNLOAD_URL)
				return this._getDirectDownloadUris();

			// The request is for manual download, no MID Sever is available.
			// The download can be done through the instance
			uris.push(this._getDownloadThroughInstanceUri());
			return uris;
		}

		// The MID Server has old code and can not download through instance
		if (!this._canDownloadThroughInstance())
			return this._getDirectDownloadUris();

		uris.push(this._getDownloadThroughInstanceUri());
		return uris;
	},

	/**
	 * Returns true if the  MID that request the factory has the code can 
	 * download through the instance. Kingston or older MID Servers doesn't have
	 * the necessay codes and to upgrade they need to use direct download uris.
	 **/
	_canDownloadThroughInstance: function() {
		var gr = new GlideRecord('ecc_agent');
		gr.get('sys_id', this._midSysId);
		var midVersion = gr.getValue('version');

		// There is a record in the MID Server but the version is not set yet
		if (!midVersion)
			return false;

		var midReleaseName = midVersion.match(/^[a-zA-Z]/);

		// The mid version doesn't have release name it is on Master or before Geneva
		if (!midReleaseName)
			return false;

		// MID version is before London and it doesn't have the proper code
		if (midReleaseName[0].toLowerCase() < 'l')
			return false;

		return true;
	},

	_getDirectDownloadUris: function() {
		var uris = [];
		var filePath = this._path + DistDownloadUriFactory._SEPARATOR + this._fileName;
		var uri = DistDownloadUriFactory._BASE_DIRECT_DOWNLOAD_HTTPS_URI + filePath;
		uris.push(uri);
		uri = DistDownloadUriFactory._BASE_DIRECT_DOWNLOAD_HTTP_URI + filePath;
		uris.push(uri);

		return uris;
	},

	_getDownloadThroughInstanceUri: function() {
		this._validatePath(); 
		var uri = DistDownloadUriFactory._DOWNLOAD_THROUGH_INSTANCE_BASE_URL
		+ DistDownloadUriFactory._SEPARATOR + this._requestSourceUrl
		+ DistDownloadUriFactory._SEPARATOR + this._fileName 
		+ '?sysparm_payload_type=distribution_download' + '%26'
		+ 'sysparm_route_path=' + this._path;

		return uri;
	},

	/**
	 * sysparm value for the route_path in download through the instance needs to have
	 * '/' as the first and the last character like 'sysparm_route_path=/dir1/dir2/
	 * this function will add '/' at the begining or at the end of the path if they
	 * were missed.
	 **/
	_validatePath: function() {
		var firstChar = this._path[0];
		if (firstChar != '/')
			this._path = '/' + this._path ;

		var lastChar = this._path[this._path.length -1];
		if (lastChar != '/')
			this._path = this._path + '/';
	},

	type: 'DistDownloadUriFactory'

};
```