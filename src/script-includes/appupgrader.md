---
title: "AppUpgrader"
id: "appupgrader"
---

API Name: sn_appclient.AppUpgrader

```js
var AppUpgrader = Class.create();
AppUpgrader.prototype = {
	
	CANNOT_INSTALL_OR_UPDATE : gs.getMessage("Insufficient privileges to install or update an application package:"),
	DELETE_OLD_APP_PACKAGE : gs.getMessage("Deleting old application package"),
	INSTALL_APP_PACKAGE : gs.getMessage("Installing application package"),
	APP_IS_NOT_AVAILABLE: "Application unavailable for installation on this instance, app id: {0}",
	NO_ASSIGNED_VERSION: "Aborting upgrade of application: {0}, no assigned version specified",
	NO_UPGRADE_NECESSARY: "Application is already on desired version ({0}), no upgrade necessary for {1}",
	CANT_DOWNGRADE: "Application cannot be downgraded: {0}, from version: {1}, to version: {2}",
	PLUGIN_DEPENDENCY_UNAVAILABLE: "Aborting installation of application: {0}, application depends on plugins which are not available on this instance: {1}",
	APP_DEPENDENCY_UNAVAILABLE: "Aborting installation of application: {0}, application depends on other applications which are not accessible at app store: {1}",
		
    initialize: function() {
		this._instanceId = gs.getProperty("instance_id");
		this._instanceName = gs.getProperty("instance_name");
		this._autoUpdateEnabled = gs.getProperty('sn_appclient.auto_update', 'true') == 'true';
		this.versionComparator = new VersionComparator();
		this.glideAppLoader = new GlideAppLoader();
		this._PARENT_TRACKER = GlideExecutionTracker.getLastRunning();
    },
	
	autoUpdates: function() {
		var updates = this._getAutoUpdates();
		for (var i = 0; i < updates.length; i++) {
			var update = updates[i];
			this.upgradeProcess(update.source_app_id, update.latest_version, false, true);
		}		
	},
	
	/***
	 * Installs or updates store app for dependent apps or installing an app during the upgrade
	 */
	upgrade: /*boolean*/ function(/*source_app_id*/ appID, /*String*/ version, /*String*/ loadDemoData) {
		return this.upgradeProcess(appID, version, loadDemoData, false);
	},

	/***
	 * Installs or updates the root store app from the UI or autoUpdate schedule job
	 */
	upgradeProcess: /*boolean*/ function(/*source_app_id*/ appID, /*String*/ version, /*String*/ loadDemoData, obtainMutex,/*boolean*/ isReinstallRequested, /*object*/ additionalArgs) {
		gs.info("upgrade(): appID={0}, version={1}, loadDemoData={2}, reinstall={3}", appID, version, loadDemoData,isReinstallRequested);

		this.installationStartTime = new GlideDateTime().getValue();
		var storeApp = this._getOrCreateStoreApp(appID, version);

        //PRB1320429: Dependent Apps skip loading conditional content of parent - figure out all app dependencies for the app.
        var dependencyObj = this.getAllSNScopeDependencies({sysStoreApp: [], sysRemoteApp: []}, storeApp.scope);

		if (!this._shouldInstallOrUpgrade(storeApp, version, isReinstallRequested))
			return false;

		storeApp.assigned_version = version;
		if (!gs.nil(additionalArgs) && storeApp.isValidField("installation_info"))
			storeApp.installation_info = JSON.stringify(additionalArgs);
		storeApp.update();

		var installTracker = this._PARENT_TRACKER.createChildIfAbsent(this.INSTALL_APP_PACKAGE);
		installTracker.run();
		installTracker.incrementPercentComplete(2);		
		
		// Install new app package
		if (!this._installApplicationPackage(storeApp, loadDemoData == "true", obtainMutex)) {
			var error = gs.getMessage("Unable to successfully install application package {0}:{1}", [storeApp.name, version]);
			if (this._failTrackerIfNeeded(installTracker, error))
				this._PARENT_TRACKER.fail(error);

			return false;
		}
		//if we got this far, we can safely remove the old sys_app_version records
		//anynewer versions will be downloaded next time UpdateChecker runs
		this._removeAppVersions(appID, version);

		//update installation info for the latest installed apps 
		//this will filter the existing installed apps from the current installed apps and stamp the installation info this is work around for the dependent apps
		this.updateInstallationInfoOnLatestInstalledApps(additionalArgs);

		//BEGIN: PRB1320429: Dependent Apps skip loading conditional content of parent
        if (typeof this.glideAppLoader.loadConditionalContent != "undefined") {
            for (var i = 0; i < dependencyObj.sysRemoteApp.length; i++) {
                gs.info("Loading conditional content post install {0}", dependencyObj.sysRemoteApp[i]);
                this.glideAppLoader.loadConditionalContent(dependencyObj.sysRemoteApp[i], true);
            }
        }
        //END: PRB1320429: Dependent Apps skip loading conditional content of parent

        gs.info("Successfully installed application {0}:{1}", storeApp.name, storeApp.version);
		installTracker.success();
		
		return true;
	},

    getAllSNScopeDependencies: function(obj, scope){
      var dependencyArr = [];
      var grStoreApp = new GlideRecord("sys_store_app");
      grStoreApp.addQuery("scope",scope);
      grStoreApp.query();
      if(grStoreApp.next()){
      	if(grStoreApp.active.toString() === "true")
            obj.sysStoreApp.push(scope);
      	else
      		obj.sysRemoteApp.push(scope);
        dependencyArr = grStoreApp.dependencies.toString().split(",");
      } else {
        var grRemoteApp = new GlideRecord("sys_remote_app");
        grRemoteApp.addQuery("scope",scope);
        grRemoteApp.query();
        if(grRemoteApp.next()){
          obj.sysRemoteApp.push(scope);
          dependencyArr = grRemoteApp.dependencies.toString().split(",");
        }
      }
      for(var i = 0; i < dependencyArr.length; i++) {//go through all dependencies
        var depPair = dependencyArr[i].split(":");
        if(depPair.length == 2
                && depPair[1] != "sys"
                && depPair[0] != "global"
                && obj.sysStoreApp.indexOf(depPair[0]) == -1
                && obj.sysRemoteApp.indexOf(depPair[0]) == -1){//make sure arr doesnt have this scope already. avoiding infinite loop
          obj = this.getAllSNScopeDependencies(obj, depPair[0]);//figure out the dependencies
        }
      }
      return obj;
    },

    _getOrCreateStoreApp: /*GlideRecord sys_store_app*/ function(/*String*/ appID, /*String*/ version) {
		var storeApp = new GlideRecord("sys_store_app");
		if (!storeApp.get(appID))
			storeApp = this._convertToStoreApp(appID, version);
		if (!gs.isPaused())
			this._setValuesFromVersion(storeApp, version);
		return storeApp;
	},
	
	_convertToStoreApp: /*GlideRecord sys_store_app*/ function (/*String*/ remoteAppId, /*String*/ version) {
		var remoteApp, storeApp;
		
		remoteApp = new GlideRecord("sys_remote_app");
		if (!remoteApp.get(remoteAppId))
			throw new Error("Unable to find expected remote app: " + remoteAppId);
		
				
		if(remoteApp.getValue("delivery_source") == 'out_of_band' && !gs.isPaused())
			if(sn_lef.GlideEntitlement.isLicenseCheckRequired(remoteApp.getValue("sys_code")))
				if(!sn_lef.GlideEntitlement.hasLicenseForApp(remoteApp.getValue("sys_code"))){
					var msg = gs.getMessage("Aborting installation of application: {0}, application does not have a valid license", [remoteApp.getValue("name")]);
					gs.error(msg);
					this._PARENT_TRACKER.fail(msg);
					throw new Error("license not found for "+remoteApp.getValue("name"));
				}
		
		// create a new sys_store_app record, using sys_remote_app as a copy
		gs.info("Creating new sys_store_app " + remoteAppId + " from sys_remote_app entry");		
		storeApp = new GlideRecord("sys_store_app");
		storeApp.initialize();
		storeApp.setValue("sys_id", remoteAppId);
		storeApp.setNewGuidValue(remoteAppId);
		storeApp.setValue("name", remoteApp.getValue("name"));
		storeApp.setValue("scope", remoteApp.getValue("scope"));
		storeApp.setValue("latest_version", remoteApp.getValue("latest_version"));
		storeApp.setValue("assigned_version", version);
		storeApp.setValue("vendor", remoteApp.getValue("vendor"));
		storeApp.setValue("vendor_prefix", remoteApp.getValue("vendor_prefix"));
		storeApp.setValue("short_description", remoteApp.getValue("short_description"));
		storeApp.setValue("dependencies", remoteApp.getValue("dependencies"));
		storeApp.setValue("compatibilities", remoteApp.getValue("compatibilities"));
        storeApp.setValue("is_store_app", remoteApp.getValue("is_store_app"));
		storeApp.setValue("demo_data", remoteApp.getValue("demo_data"));
		storeApp.setValue("shared_internally", remoteApp.getValue("shared_internally"));
		storeApp.setValue("auto_update", !!remoteApp.auto_update);
		storeApp.setValue("active", false); // when installed it'll become active
		if (storeApp.isValidField("last_installed_from"))
			storeApp.setValue("last_installed_from",remoteApp.getValue("delivery_source"));
		storeApp.setValue("upload_info", remoteApp.getValue("upload_info"));
		storeApp.setValue("products", remoteApp.getValue("products"));
		
		/*Get LOB and Price type value for installed version.
		If no value is available, fallback to the values in sys_remote_app table
		*/
		var versionAttributes = this._getVersionAttributes(remoteApp.getValue("source_app_id"), version);
		
		var versionLob = versionAttributes ? versionAttributes.lob : remoteApp.getValue("lob"),
		    versionPrice = versionAttributes ? versionAttributes.price_type : remoteApp.getValue("price_type"),
		    versionIndicators = versionAttributes ? versionAttributes.indicators : remoteApp.getValue("indicators"),
		    versionDateMessage = versionAttributes ? versionAttributes.display_message : remoteApp.getValue("display_message"),
		    versionNeedsAppEngineLicensing = versionAttributes.needs_app_engine_licensing ? versionAttributes.needs_app_engine_licensing : remoteApp.needs_app_engine_licensing,
		    versionCustomTableCount = versionAttributes.custom_table_count ? versionAttributes.custom_table_count : remoteApp.getValue("custom_table_count");
		
		storeApp.setValue("lob", versionLob);
		storeApp.setValue("price_type", versionPrice);
		storeApp.setValue("indicators", versionIndicators);
		storeApp.setValue("display_message", versionDateMessage);
		storeApp.setValue("uninstall_blocked", remoteApp.uninstall_blocked);
		storeApp.setValue("hide_on_ui", remoteApp.hide_on_ui.toString() == "true" ? true : false );
		storeApp.setValue("installed_as_dependency", remoteApp.installed_as_dependency.toString() == "true" ? true : false);
		storeApp.setValue("needs_app_engine_licensing", versionNeedsAppEngineLicensing);
		storeApp.setValue("custom_table_count", versionCustomTableCount);

		storeApp.insert();
		if (!storeApp.isValidRecord())
			throw new Error("Unable to create new sys_store_app record: " + remoteAppId);

		// Reap sys_remote_app, since we now have a store app to install
        this.glideAppLoader.reapOldRemoteApp(remoteApp, storeApp);
		
		return storeApp;
	},
	
	_getVersionAttributes: /*Object*/ function (sourceAppId, version) {
		var appVersion = new GlideRecord("sys_app_version");
		appVersion.addQuery("version", version);
		appVersion.addQuery("source_app_id", sourceAppId);
		appVersion.query();
		
		if(appVersion.next()) {
			return {	"lob": appVersion.getValue("lob"), 
					"price_type": appVersion.getValue("price_type"),
					"indicators": appVersion.getValue("indicators"),
					"display_message": appVersion.getValue("display_message"),
					"needs_app_engine_licensing": appVersion.needs_app_engine_licensing,
					"custom_table_count": appVersion.getValue("custom_table_count")
					};
		} else 
			return "";	
	},
		
	_shouldInstallOrUpgrade: /*boolean*/ function(/*sys_store_app*/ storeApp, /*String*/ version, /*boolean */ isReinstall) {
		var msg;
		if(!gs.isPaused() && !this._userHasInstallAccess(storeApp)) {
			msg = gs.getMessage("Insufficient privileges for user: {0} to install or update an application package {1}", [gs.getUserID(), storeApp.sys_id]);
			gs.error(msg);
			this._PARENT_TRACKER.fail(msg);
			return false;
		}
		
		if (!storeApp.isValidRecord()) {
			msg = gs.getMessage(this.APP_IS_NOT_AVAILABLE, storeApp.sys_id);
			gs.error(msg);
			this._PARENT_TRACKER.fail(msg);
			return false;
		}
		
		var assignedVersion = this._cleanVersion(version);
		if (gs.nil(assignedVersion)) {
			msg = gs.getMessage(this.NO_ASSIGNED_VERSION, storeApp.name);
			gs.error(msg);
			this._PARENT_TRACKER.fail(msg);
			return false;
		}
		
		var installedVersion = this._cleanVersion(storeApp.version);
		if (assignedVersion == installedVersion && storeApp.active && !gs.isPaused() && !isReinstall) {
			msg = gs.getMessage(this.NO_UPGRADE_NECESSARY, [assignedVersion, storeApp.name]);
			gs.info(msg);
			this._PARENT_TRACKER.success(msg);
			return false;
		}
		
		/** installed = from/current, assigned = to/target */
		if (this._isDowngrade(installedVersion, assignedVersion)) {
			msg = gs.getMessage(this.CANT_DOWNGRADE, [storeApp.name, installedVersion, assignedVersion]);
			gs.error(msg);
			this._PARENT_TRACKER.fail(msg);
			return false;
		}
		
		this._checkCompatibility(storeApp, version);

		if (this._unavailableDepPlugins != "") {
			msg = gs.getMessage(this.PLUGIN_DEPENDENCY_UNAVAILABLE, [storeApp.name, this._unavailableDepPlugins]);
			gs.error(msg);
			this._PARENT_TRACKER.fail(msg);
			return false;
		}

		if (this._inaccessibleDepApps != "") {
			msg = gs.getMessage(this.APP_DEPENDENCY_UNAVAILABLE, [storeApp.name, this._inaccessibleDepApps]);
			gs.error(msg);
			this._PARENT_TRACKER.fail(msg);
			return false;
		}

		if(this._depAppsBlockedForInstall != ""){
			msg = gs.getMessage("Aborting installation of application: {0}, application depends on other applications which are blocked for install: {1}", [storeApp.name, this._depAppsBlockedForInstall]);
			gs.error(msg);
			this._PARENT_TRACKER.fail(msg);
			return false;
		}
		return true;
	},

	_userHasInstallAccess : function(/*GlideRecord sys_store_app*/ storeApp) {
		if (GlidePluginManager.isActive("com.glide.app_api")) {
			if (typeof sn_app_api.AppStoreAPI.canInstallOrUpgrade != "undefined")
				return sn_app_api.AppStoreAPI.canInstallOrUpgrade(storeApp);
		}

		// admin or app_client_user is allowed to install or upgrade
		if (gs.hasRole('sn_appclient.app_client_user'))
			return true;

		return false;
	},
	
	_setValuesFromVersion : function(/*GlideRecord sys_store_app*/ storeApp, /*String*/ version) {
		var versionGr = new GlideRecord('sys_app_version');
		versionGr.addQuery("source_app_id", storeApp.getValue("sys_id"));
		versionGr.addQuery("version", version);
		versionGr.query();
		
		if (versionGr.getRowCount() == 1 && versionGr.next()) {
			//update dependencies, short_description etc
			storeApp.setValue("auto_update", versionGr.getValue("auto_update"));
			storeApp.setValue("demo_data", versionGr.getValue("demo_data"));
			storeApp.setValue("dependencies", versionGr.getValue("dependencies"));
            storeApp.setValue("compatibilities", versionGr.getValue("compatibilities"));
            storeApp.setValue("is_store_app", versionGr.getValue("is_store_app"));
			storeApp.setValue("name", versionGr.getValue("name"));
			storeApp.setValue("short_description", versionGr.getValue("short_description"));
			storeApp.setValue("last_installed_from", versionGr.getValue("delivery_source"));
			storeApp.setValue("upload_info", versionGr.getValue("upload_info"));
			storeApp.setValue("uninstall_blocked", versionGr.uninstall_blocked);
			storeApp.setValue("hide_on_ui", versionGr.hide_on_ui.toString() == "true" ? true : false);
			storeApp.setValue("installed_as_dependency", versionGr.installed_as_dependency.toString() == "true" ? true : false);
			storeApp.setValue("needs_app_engine_licensing", versionGr.needs_app_engine_licensing);
			storeApp.setValue("custom_table_count", versionGr.custom_table_count);
			
			this._setValuesFromManifest(storeApp, version);

		}
			
	},
	
	_setValuesFromManifest: function(/*GlideRecord sys_store_app */ storeApp, /*string*/ version) {
		var manifestService = new ManifestService();
		var manifest = manifestService.getManifestForAppVersion(storeApp.getValue("sys_id"), version);
		var mapRepo, map, source, target, i;
		var licenseModel, licenseDefinition;

		if (manifest && manifest.hasOwnProperty("additional_fields")) {
			mapRepo = new ManifestFieldMap(manifest);
			for (i = 0; i< manifest.additional_fields.length; i++) {
				source = manifest.additional_fields[i];
				map = mapRepo.getMap(source.field_name);
				target = map(source);

				gs.debug("Setting field {0} to {1}, from manifest", target.field_name, target.value);
				if (storeApp.isValidField(target.field_name)) {
					if (target.field_name == "license_model") {
						licenseModel = target.value;
						storeApp.setValue(target.field_name, target.value);
					} else if (target.field_name == "license_definition")
						licenseDefinition = target.value;
					else
						storeApp.setValue(target.field_name, target.value);
				}
			}

			if (gs.nil(licenseDefinition) ||
				!(sn_app_api.AppStoreAPI.isISVScope(storeApp.scope)) ||
				licenseModel != "capacity") {
				storeApp.setValue("license_definition", "");
			}
			else
				storeApp.setValue("license_definition", licenseDefinition);
		}
	},
	
	_cleanVersion: /*String*/ function(/*String*/ version) {
		if (gs.nil(version))
			return '';
		
		return (version+'').trim();
	},
	
	/**
	 * Analyzes dependencies for the installing app. 
	 * Produces this._unavailableDepPlugins, this._inaccessibleDepApps, this._depAppsBlockedForInstall CSV lists as result of its execution.
	 */
	_checkCompatibility: /*void*/ function(/*sys_store_app*/ storeApp, /*String*/ version) {
		this._unavailableDepPlugins = ""; // comma-separated list of dependency plugins which are unavailable at this instance 
		this._inaccessibleDepApps = ""; // comman-seprated list of dependency apps which are unavailable at app store
		this._depAppsBlockedForInstall = "";
		var dependencies = storeApp.dependencies + "";
		gs.info("_checkCompatibility: dependencies = " + dependencies);
		if (gs.nil(dependencies))
			return;

    // For servicenow Apps we want to auto resolve optional plugin dependency.
    var isServiceNowApp = storeApp.scope.indexOf("sn_") == 0;

		var depArray = dependencies.split(",");
		var dependencyApps = "";
		for (var i = 0; i < depArray.length; i++) {
			var depPair = depArray[i].split(":"); // pair of dependency id and version
			if (depPair.length > 0 && gs.nil(depPair[0]))
				continue;
			
			if (depPair.length < 2 || depPair[1] == "sys") { // handle plugin dependencies
				var name = depPair[0];
				if (name.startsWith("apps/") || name.startsWith("glidesoft"))
					continue;
				
				gs.info("_checkCompatibility: dependency = " + depPair[0]);
				var isPluginActive = GlidePluginManager.isActive(depPair[0]);
				if (!isPluginActive && !isServiceNowApp) {
					if (this._unavailableDepPlugins != "")
					 	this._unavailableDepPlugins += ",";
					 this._unavailableDepPlugins += depPair[0];
				}
			} else {
				if (this._appAlreadyExist(depPair))
					continue;

				if (dependencyApps != "")
					 dependencyApps += ",";

				dependencyApps += depArray[i];
			}
		}

		gs.info("_checkCompatibility: this._unavailableDepPlugins = " + this._unavailableDepPlugins);
		gs.info("_checkCompatibility: dependencyApps = " + dependencyApps);
		// now validate app dependencies at app store only if app is installed from UI which is not offline app and not during zboot or upgrade
		if (dependencyApps != "" && !gs.isPaused()) {
			var dependencyProcessorObj = new DependencyProcessor(storeApp.scope);
			var dependentAppsStatus = dependencyProcessorObj.processDependency(dependencyApps.split(','));
			dependentAppsStatus.forEach(function(dependentApp) {
				if(!dependentApp.active) {
				    if(dependentApp.status == dependencyProcessorObj.knownStatusMap["Installation blocked"]) {
                        this._depAppsBlockedForInstall += (this._depAppsBlockedForInstall == "") ? dependentApp.Id : "," + dependentApp.Id;
                    }else{
                        this._inaccessibleDepApps += (this._inaccessibleDepApps == "") ? (dependentApp.Id + ":" + dependentApp.minVersion) : ("," + dependentApp.Id + ":" + dependentApp.minVersion);
                    }
                }
			},this);
		}
		gs.info("_checkCompatibility: this._inaccessibleDepApps = " + this._inaccessibleDepApps);
	},
	
	_installApplicationPackage: /*boolean*/ function(/*sys_store_app*/ storeApp, /*Boolean*/ loadDemoData, obtainMutex) {
		gs.info("Installing or upgrading application: " + storeApp.name + ", loadDemoData: " + loadDemoData);
		if (obtainMutex == true) {
			if (typeof this.glideAppLoader.installOrUpgradeAppWithMutex != "undefined")
				return this.glideAppLoader.installOrUpgradeAppWithMutex(storeApp.getUniqueValue(), loadDemoData);
		}

		return this.glideAppLoader.installOrUpgradeApp(storeApp.getUniqueValue(), /* deprecated */ "", loadDemoData);
	},
	
	_isDowngrade: /*boolean */ function(/*from version*/ currentVersion, /* to version */ targetVersion) {
		return this.versionComparator.isDowngrade(currentVersion, targetVersion);
	},
	
	_isAppCompatible: function(appId, version) {
		var appVersions = new GlideRecord("sys_app_version");
		appVersions.addQuery("source_app_id", appId);
		appVersions.addQuery("version", version);
		appVersions.addQuery("block_install", false);
		appVersions.query();

		return appVersions.getRowCount();
	},

	_getAutoUpdates: /*[{source_app_id,latest_version},...]*/ function() {
		var updates = [];
		
		if (!this._autoUpdateEnabled) {
			gs.info('Skipping app auto-updates (behavior was disabled via property override)');
			return updates;
		}
		
		var storeApp = new GlideRecord('sys_store_app');
		if (!storeApp.isValidField('auto_update')) {
			gs.info('Skipping app auto-updates (field sys_store_app.auto_update not found)');
			return updates;
		}
		
		storeApp.addQuery('auto_update', true);
		storeApp.addNotNullQuery('version');
		storeApp.addNotNullQuery('latest_version');
		storeApp.query();
		gs.info('Got ({0}) candidate records to check for auto-update on', storeApp.getRowCount());
		while (storeApp.next()) {
			var installedVersion = this._cleanVersion(storeApp.getValue('version'));
			var latestVersion = this._cleanVersion(storeApp.getValue('latest_version'));
			if (gs.nil(latestVersion) || latestVersion == installedVersion)
				continue;
			
			var assignedVersion = this._cleanVersion(storeApp.getValue('assigned_version'));
			if (latestVersion == assignedVersion)
				continue; // upgrade in progress
				
			var source_app_id = storeApp.getUniqueValue();
			var scope = storeApp.scope.toString();	
			if(!this._isAppCompatible(source_app_id, latestVersion))
				continue;

			gs.info('Auto-update store app {0} ({1}) from {2} to {3}', 
				scope, source_app_id, installedVersion, latestVersion);
			
			var update = { source_app_id: source_app_id, scope: scope, latest_version: latestVersion };
			updates.push(update);
		}
		if (storeApp.getRowCount() > 0)
			gs.info('({0}) apps to auto-update', updates.length);
		
		return updates;
	},
	
	_removeAppVersions : function(/*string*/ source_app_id, version) {
		//we either installed for the first time, or updated an existing app
		var appVersions = new GlideRecord("sys_app_version");
		appVersions.addQuery("source_app_id", source_app_id);
		appVersions.query();

		while (appVersions.next()) {
			gs.info("Comparing {0} to {1}, is {1} an upgrade? {2}", version, appVersions.getValue("version"), this.versionComparator.isUpgrade(version, appVersions.getValue("version")));
			if (!this.versionComparator.isUpgrade(version, appVersions.getValue("version")))
				appVersions.deleteRecord();
			else {
				appVersions.setValue("remote_app", "");
				appVersions.setValue("store_app", source_app_id);
				appVersions.update();
			}
		}
	},

	_appAlreadyExist: /*boolean*/ function(/*[]*/ depPair) {

		// dependency format of scope:version:id, and this might be a global app
		if (depPair.length < 3)
			return false;

		var wantVersion = depPair[1];
		var appId = depPair[2];
		var haveVersion;

		var availablePackage = new GlideRecord("sys_package");
		availablePackage.addQuery("source", appId);
		availablePackage.query();
		if (!availablePackage.next())
			return false;

		haveVersion = availablePackage.getValue("version");
		var comparator = new VersionComparator();

		//we can allow it if the current version is equal or greater than want version
		return !comparator.isUpgrade(haveVersion, wantVersion);
	},
	
	_failTrackerIfNeeded: function (tracker, message) {
		gs.error(message);
		var execTracker = new GlideRecord("sys_execution_tracker");
		execTracker.get(tracker.getSysID());
		if (!execTracker.isValidRecord())
			return false;

		// The tracker was already failed
		if (execTracker.state == 3)
			return false;

		tracker.fail(message);
		return true;
	},
	getLatestUpgradeHistory: function (appId) {
		
		var gr = new GlideRecord('sys_upgrade_history');
		gr.addQuery('to_version',appId);
		gr.orderByDesc('sys_created_on');
		gr.setLimit(1);
		gr.query();
		
		if(gr.next())
			return gr.getValue('sys_id');
		return "";
	},
	getLoggedInUserEmail : function(){
		var user = new GlideRecord("sys_user");
		user.get(gs.getUserID());
		return user.getValue("email");
	},
	updateInstallationInfoOnLatestInstalledApps : function(additionalArgs){
		var storeGr = this.getActiveStoreAppsInInstallationWindow();
		while(storeGr.next()) {
			if (!gs.nil(additionalArgs) && storeGr.isValidField("installation_info")) {
					storeGr.installation_info = JSON.stringify(additionalArgs);
					storeGr.setWorkflow(false);
					storeGr.update();
			}
		}
	},
	getActiveStoreAppsInInstallationWindow : function (){
		var installationEndTime = new GlideDateTime().getValue();
		var storeAppGr = new GlideRecord("sys_store_app");
		storeAppGr.addQuery("update_date",">=",this.installationStartTime);
		storeAppGr.addQuery("update_date","<=",installationEndTime);
		storeAppGr.addActiveQuery();
		storeAppGr.query();
		return storeAppGr;
	},

    type: 'AppUpgrader'
};
```