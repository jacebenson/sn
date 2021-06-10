---
title: "AppUpgradeAjaxProcessor"
id: "appupgradeajaxprocessor"
---

API Name: sn_appclient.AppUpgradeAjaxProcessor

```js
var AppUpgradeAjaxProcessor = Class.create();
AppUpgradeAjaxProcessor.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
	install : function(){
	var appID = this.getParameter('sysparm_app_sys_id');
	var version = this.getParameter('version');
	var loadDemoData = this.getParameter('loadDemoData');
	gs.info("Download app: {0}, version: {1}, loadDemoData: {2}, reinstall: {3}", appID, version, loadDemoData, true);
	var progress_name = "Install Application";
	var worker = new GlideScriptedHierarchicalWorker();
	worker.setProgressName(progress_name);
	worker.setBackground(true);
	worker.setCannotCancel(true);
	worker.setScriptIncludeName("sn_appclient.AppUpgrader");
	worker.setScriptIncludeMethod("upgradeProcess");
	worker.putMethodArg("appID", appID);
	worker.putMethodArg("version", version);
	worker.putMethodArg("loadDemoData", loadDemoData);
	worker.putMethodArg("obtainMutex", true);
	worker.putMethodArg("isReinstallRequested",true);
	worker.putMethodArg("additionalArgs",{
		"installed_user":
		{
			"user_id" : gs.getUserName(),
			"user_email" : new AppUpgrader().getLoggedInUserEmail()
		}
	});
	worker.start();
	var trackerId = worker.getProgressID();
	return trackerId;
	},

	getInstallationStatus : function(){
		var trackerId = this.getParameter('trackerId');
		var progressTracker = new ProgressTracker();
		var data = progressTracker.getStatus(trackerId);
		return data;
	},

	isAppUpgradeHistoryExists : function(){
		var appId = this.getParameter('sysparm_app_scope');
		gs.info("getUpgradeHistory() sysId of app/plugin : {0}", appId);
		var upgradeHistorySysId = new sn_appclient.AppUpgrader().getLatestUpgradeHistory(appId);
		return upgradeHistorySysId;
	},
	type: 'AppUpgradeAjaxProcessor'
});
```