---
title: "LogoDownloader"
id: "logodownloader"
---

API Name: sn_appclient.LogoDownloader

```js
var LogoDownloader = Class.create();
LogoDownloader.prototype = {
    initialize: function() {
    },
	downloadLogoForApps: function(logoDownloadList) {
		var updateChecker = new UpdateChecker();
		for (var logoIterator = 0; logoIterator < logoDownloadList.length; logoIterator++) {
			var logoUpdate = logoDownloadList[logoIterator];
			var logoChangeApp = updateChecker._getApp(logoUpdate.source_app_id);
			if (logoChangeApp == null)
				continue;
			var logoResponse = this.getLogoDownloadInfo(logoUpdate[logoUpdate.relevant_version].logo_hash, logoChangeApp);
			if (logoResponse.downloadLogo) {
				this.updateLogo(logoChangeApp, logoResponse.attachment);
			}
		}
	},

	updateLogo: /*sys_attachment id*/ function(/* GlideRecord sys_remote_app | sys_store_app */ app, /*GlideRecord sys_attachment*/ logo) {
		var targetTableName = app.getTableName();
		var version = (targetTableName == "sys_store_app" ? app.getValue("version").toString() : this._getLatestNonBlockedVersion(app));
		if (!version)
			return;
		var attachmentSysID = '';
		var tracker = null;
		var source_app_id = app.sys_id.toString();
		var targetTableSysId = app.getUniqueValue();		
		var targetFileName = "logo";
		var targetFileContentType = "image/jpeg";
		if(app.getValue("delivery_source") == 'offline')
			this._copyAttachmentLogo(app, "sys_offline_app");
		else{
			gs.info("Downloading logo for: {0}, source_app_id: {1}, version: {2}", app.getValue("name"), source_app_id, version);
			attachmentSysID = new ScopedAppRepoRequest("update_logo")
			.setParameter("source_app_id", source_app_id)
			.setParameter("version", version)
			.downloadAttachment(targetTableName, targetTableSysId, targetFileName, targetFileContentType, tracker);
		}
		if(attachmentSysID && logo)
			this._deleteAttachment(logo);
		return attachmentSysID;
	},
	
	//get highest version of the app from sys_app_version where block_install is false
	_getLatestNonBlockedVersion: function(app) {
		var gr=new GlideRecord("sys_app_version");
		gr.addQuery("source_app_id", app.getValue("source_app_id"));
		gr.addQuery("block_install", false);
		gr.query();
		
		if(!gr.hasNext())
			return;
		
		var appVersionList = [];
		while(gr.next()) {
			appVersionList.push({
				version: gr.getValue("version")
			});
		}
		appVersionList = new VersionComparator().sortVersions(appVersionList);
		return appVersionList[appVersionList.length - 1].version;
	},
	
	_deleteAttachment: /*void*/ function( /*GlideRecord sys_attachment*/logo) {
		if (logo != null) {
			gs.debug("Removing old logo for app " + logo.getValue("table_name") + ":" + logo.getValue("table_sys_id") + " logo sys_id: " + logo.getValue("sys_id"));
			new GlideAppLoader().reapOldLogo(logo);
		}
	},
	_copyAttachmentLogo : function(appgr, sourceTable){
		var offlinegr = new GlideRecord(sourceTable);
		offlinegr.addQuery("source_app_id",appgr.getUniqueValue());
		offlinegr.addQuery("latest_version",appgr.getValue("latest_version"));
		offlinegr.query();
		if(offlinegr.next()){
			var attachment = new GlideRecord("sys_attachment");
			attachment.get(offlinegr.getValue("logo"));
			if(attachment.isValidRecord())
				new GlideSysAttachment().writeBase64(appgr,"logo","image/jpeg",new GlideSysAttachment().getContentBase64(attachment));
		}
	},
	// checks whether to download logo or not based on hash value.
	getLogoDownloadInfo: function(logo_hash, appgr) {
		var response = {"downloadLogo": true, "attachment": null};
		var tableSysId = appgr.sys_id.toString();
		var att = new GlideRecord("sys_attachment");
		att.addQuery("table_sys_id", tableSysId);
		att.addQuery("file_name", "logo");
		att.addQuery("table_name", appgr.getRecordClassName());
		att.query();
		if (att.next()) {
			response.attachment = att;
			if(att.hash == logo_hash)
				response.downloadLogo = false;
		}
		return response;
	},
	
    type: 'LogoDownloader'
};
```