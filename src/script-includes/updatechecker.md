---
title: "UpdateChecker"
id: "updatechecker"
---

API Name: sn_appclient.UpdateChecker

```js
var UpdateChecker = Class.create();
UpdateChecker.prototype = {
    initialize: function() {
		this._quiet = gs.getProperty("sn_appclient.http_check_updates_quietly", "true") == "true";
		this.json = new global.JSON();
		this.versionComparator = new VersionComparator();
		this.glideAppLoader = new GlideAppLoader();
		this.appNotificationConfig = this._getAppNotificationConfig();
		this.totalAppNotificationCount = 0;
		this.ENTITLEMENT_REVOKED = "entitlement_revoked";
		this.TRIAL_DEACTIVATION_REQUESTED = "trial_deactivation_requested";
		this.NOTIFICATION_GROUP_NAME = "StoreAppNotifications";
		this.VERSION_TYPE = {
			INSTALLED: "installed",
			MOST_RECENT: "most_recent"
		};
		this.downloadLogoList = [];
		this.constants = {
			"NO_LOGO_EXIST": "no_logo_exist"
		};
		this.canSendNotification = gs.getProperty("com.snc.unified_plugin.connect.notification.enabled", "false") == "true";
    },

	_getAppNotificationConfig: function() {
		return {
			"appAvailableForInstall": {
				"count": 0,
				"filter":[
				{
					"category": gs.getMessage("Licensing"),
					"id": "sub"
				},
				{
					"category": gs.getMessage("Managing"),
					"id": "not_installed"
				}],
				"linkText": gs.getMessage("Apps available for install")
			},
			"appAvailableForUpdate": {
				"count": 0,
				"filter":[
				{
					"category": gs.getMessage("Managing"),
					"id": "updates"
				}],
				"linkText": gs.getMessage("App Updates")
			},
			"appDeactivationRequests": {
				"count": 0,
				"filter":[
				{
					"category": gs.getMessage("Indicators"),
					"id": "trial_deactivation_requested"
				}],
				"linkText": gs.getMessage("App deactivation requests")
			},
			"appEntitlementRevoked": {
				"count": 0,
				"filter":[
				{
					"category": gs.getMessage("Indicators"),
					"id": "entitlement_revoked"
				}],
				"linkText": gs.getMessage("Apps with entitlement revoked")
			},
		};
	},

	updateClientCallsPropertyFromAppRepo: function() {
		try {
			var gu = new GlideUpgradeUtil();
			var parms = {
				glide_build: gu.getCurrentBuild(),
				glide_build_name: gu.getCurrentBuildName(),
				applications: this._getInstalledApplicationsJSON()
			};
			var checkClientCallsResponse = new ScopedAppRepoRequest("client_calls_allowed")
				.setParameter("glide_build", parms.glide_build)
				.setParameter("glide_build_name", parms.glide_build_name)
				.setParameter("applications", parms.applications)
				.setQuiet(this._quiet)
				.post();
			var checkClientCalls = this.json.decode(checkClientCallsResponse);
			if (gs.nil(checkClientCalls) || gs.nil(checkClientCalls.client_calls_allowed))
				return;

			gs.debug("Got ({0}) client calls allowed: {1}", checkClientCalls.client_calls_allowed, this.json.encode(checkClientCalls));

			var currentPropertyValue = gs.getProperty("sn_appclient.client_calls_allowed", "true");
			var newPropertyValue = checkClientCalls.client_calls_allowed == "true";
			if (currentPropertyValue != newPropertyValue) {
				gs.debug("changing property value sn_appclient.client_calls_allowed from ({0}) to ({1})", currentPropertyValue, newPropertyValue);
				var props = {
					"sn_appclient.client_calls_allowed": newPropertyValue + ''
				};
				new GlideAppLoader().setAuthorProperties(props);
			}
		} catch (e) {
			gs.error("Unable to parse response from App Repo. The server may not be active >> {0}", checkClientCallsResponse);
		}
	},

	/**
	 * Check central app repo for available updates
	 * Refreshes the local data model and UI to reflect any changes
	 */
	checkAvailableUpdates:/*void*/ function(isInteractive, honourChecksum) {
		gs.info("appNotificationConfig: " + JSON.stringify(this.appNotificationConfig));
		gs.info("checkAvailableUpdates({0}, {1})", [isInteractive, honourChecksum]);
		var updatesMap = this._fetchAppUpdates(isInteractive, honourChecksum);
		if(!updatesMap) return;
		
		//remove apps where a local version exists
		this._filterLocalApps(updatesMap);

        //delete existing sys_remote_apps if they aren't in the updates
        this._removeInaccessibleRemoteApps(updatesMap);

		//change latest version for withdrawn installed lower version apps
		this._fixLatestVersionForWithdrawnInstalledApps(updatesMap);

        //delete versions from existing sys_app_version if they aren't in the updates
        this._removeWithdrawnAppVersions(updatesMap);

        //update app records in sys_store_app, sys_remote_app and sys_app_version tables
        this._updateAppRecords(updatesMap);

        // update logos async
        this._downloadLogosAsync();

        this._countAndSendPushNotification(updatesMap);

        this._getManifestsAsync();
    },

	_updateAppRecords: function(updatesMap) {
        for(var prop in updatesMap) {
            var update = updatesMap[prop];
            var app = this._getApp(update.source_app_id);

            this._setRelevantVersion(update, app);
            this._filterAndUpdateAppRecords(update, app);

            if (update[update.relevant_version].hasOwnProperty('logo_hash') && update[update.relevant_version].logo_hash != this.constants.NO_LOGO_EXIST)
                this.downloadLogoList.push(update);
        }
    },

	_fetchAppUpdates: function(isInteractive, honourChecksum) {
		if (gs.getProperty("sn_appclient.client_calls_allowed", "true") == "false" && gs.getProperty("sn_appclient.app.install.offline", "false") == "false") {
			gs.info("checkAvailableUpdates returning without calling repo as client_calls_allowed is false");
			return;
		}

		var payload = (gs.getProperty("sn_appclient.app.install.offline","false") == "false") ? this._getAvailableStoreUpdates(honourChecksum) : this._getOfflineUpdates();
		this.canSendNotification = !isInteractive && payload.opstatus == 2 && this.canSendNotification;

		// opstatus indicates the payload has changed from the last update
		if(payload.opstatus == 0)
			return;

		return this._getUpdatesMap(payload.data);
	},
	
	/**
	 * Retrieves available updates for this instance from the central app repository
	 */
	_getAvailableStoreUpdates : /*[sys_store_app,...]*/ function(honourChecksum) {
		var gu = new GlideUpgradeUtil();
		var installedAppsJson = this._getInstalledApplicationsJSON();
		var parms = {
			glide_build: gu.getCurrentBuild(),
			glide_build_name: gu.getCurrentBuildName(),
			applications: installedAppsJson
		};
		var scopedAppRepoRequestObj = new ScopedAppRepoRequest("get_all_available_apps");
		var candidateUpdateResponse = scopedAppRepoRequestObj
					.setParameter("glide_build", parms.glide_build)
					.setParameter("glide_build_name", parms.glide_build_name)				
					.setParameter("applications", parms.applications)
					.setQuiet(this._quiet)
					.post();
		var candidateUpdates = [];
		var currentChecksum = gs.getProperty("sn_appclient.last.processed.checksum");
		var calculatedChecksum = new GlideDigest().md5_digest(candidateUpdateResponse + installedAppsJson);
		var checksumModified = currentChecksum != calculatedChecksum;
		var errorMessage = scopedAppRepoRequestObj.getErrorMessage();
		var statusCode = scopedAppRepoRequestObj.getStatusCode();
		this._updateLatestErrorMessage(errorMessage, statusCode);

		if((honourChecksum && !checksumModified) || statusCode == 401 || statusCode == 412 || statusCode == 429) {
			if(!errorMessage)
				errorMessage = "Ignoring updates as there is no difference in payload from last received one";

			gs.debug(errorMessage);

			return {
				opstatus : 0,
				data : candidateUpdates
			};
		}
		gs.eventQueue("sn_appclient.update.system.property", null, "sn_appclient.last.processed.checksum", calculatedChecksum);
		try {
			//if talking to localhost response will be 200-OK but content is Page not Found
			candidateUpdates = this.json.decode(candidateUpdateResponse);
		} catch (e) {
			gs.error("Unable to parse response from App Repo. The server may not be active >> {0}", candidateUpdateResponse);
		}
		
		if (null == candidateUpdates || typeof candidateUpdates.push !=='function')
			candidateUpdates = [];
		
		gs.debug("Got ({0}) candidate updates: {1}", candidateUpdates.length, this.json.encode(candidateUpdates));
		
		return {
			opstatus : checksumModified ? 2 : 1,
			data : candidateUpdates
		};
	},
	
	_updateLatestErrorMessage: function(errorMessage, statusCode) {
		if(!errorMessage || statusCode !== 412)
			errorMessage = "";
		var gr = new GlideRecord("sn_appclient_store_outbound_http_quota");
		gr.get("request_type", "get_all_available_apps");
		gr.last_request_error_message = errorMessage;
		gr.update();
	},

	_downloadLogosAsync: function() {
		gs.eventQueue('sn_appclient.update.logos', null, JSON.stringify(this.downloadLogoList));
	},

	/**
	 * Downloads the logos for all apps
	 * Called by script action UpdateLogos
	 */
	downloadLogos: function(newestLogoVersions) {
		var logoDownloader = new LogoDownloader();
		gs.info("Updating logo for: {0}", this.json.encode(newestLogoVersions));
		logoDownloader.downloadLogoForApps(newestLogoVersions);
	},
	
	_getUpdatesMap: function(updates) {
		var updatesMap = {};
		for (var i = 0; i < updates.length; i++) {
			var update = updates[i];
			if(!this._isAppFieldsValid(update))
				continue;

			updatesMap[update.source_app_id] = update;

			for (var j = 0; j < update.versions.length; j++) {
				var versionObj = update.versions[j];
				updatesMap[update.source_app_id][versionObj.version] = versionObj;
			}
			delete updatesMap[update.source_app_id].versions;

		}
		return updatesMap;
	},
	
    _countAndSendPushNotification: function(updatesMap) {
        if(this.canSendNotification){
            this._checkIndicatorsCountForInstalledAppsWithNoStoreData(updatesMap);

            Object.keys(this.appNotificationConfig).forEach(function(item){
                this.totalAppNotificationCount += this.appNotificationConfig[item]["count"];
            }, this);

            if(this.totalAppNotificationCount > 0)
                this._sendPushNotification();
        }
    },

	_isAppFieldsValid: function(app) {
		var requiredFields = ["scope", "source_app_id", "versions"];
		var invalidFields = [];
		requiredFields.forEach(function(key) {
			if(!app[key])
				invalidFields.push(key);
		});

		if(invalidFields.length > 0) {
			gs.debug("Removing app {0} from the list as the required fields {1} are missing.",[app.app_name, invalidFields.join()]);
			return false;
		}
		return true;
	},

	_getInstalledApplicationsJSON: function() {
		var applications = new GlideRecord("sys_scope");
		applications.addQuery("sys_class_name", "IN", "sys_store_app,sys_app");
		applications.addQuery("sys_id", "!=", "global");
		applications.query();
		var appRay = [];
		var sysStoreAppGr = new GlideRecord("sys_store_app");
		var last_installed_from;
		var installation_info;

		while (applications.next()) {
			last_installed_from = "";
			if(applications.sys_class_name == "sys_store_app" && sysStoreAppGr.get(applications.sys_id)) {
				last_installed_from = sysStoreAppGr.last_installed_from;
				installation_info = sysStoreAppGr.getValue("installation_info");
			}

			var app = {
				source_app_id: applications.sys_id.toString(),
				source: applications.source.toString(),
				scope: applications.scope.toString(),
				active: applications.active.toString(),
				version: applications.version.toString(),
				vendor: applications.vendor.toString(),
				vendor_prefix: applications.vendor_prefix.toString(),
				sys_class_name: applications.sys_class_name.toString(),
				name: applications.name.toString(),
				scoped_administration: applications.scoped_administration.toString(),
				last_installed_from: last_installed_from.toString(),
				installation_info : installation_info
			};
			appRay.push(app);
		}
		var text = this.json.encode(appRay);
		return text;
	},

	/*
	* Deletes sys_remote_app records, if the records sys_id isn't provided as one of the
	* apps sent by the store
	*/
	_removeInaccessibleRemoteApps: /*void*/ function(/*array of hash*/accessible) {
		gs.debug("Removing all inaccessible apps");
		
		var allRemoteApps = new GlideRecord("sys_remote_app");
		allRemoteApps.query();
		while (allRemoteApps.next()) {
			var candidate_app_id = allRemoteApps.sys_id.toString();
			var candidate_scope = allRemoteApps.scope.toString();
			if (typeof accessible[candidate_app_id] == 'undefined') {
				gs.info("Removing inaccessible sys_remote_app: {0} ({1})", candidate_scope, candidate_app_id);
				allRemoteApps.deleteRecord();
			}
		}
	},
	
	_fixLatestVersionForWithdrawnInstalledApps: function(updatesMap) {
		var storeAppGr = new GlideRecord("sys_store_app");
		storeAppGr.addActiveQuery();
		storeAppGr.query();

		while(storeAppGr.next()) {
			var storeAppVersion = storeAppGr.getValue("version");
			var storeAppLatestVersion = storeAppGr.getValue("latest_version");
			if(gs.nil(updatesMap[storeAppGr.getValue("sys_id")]) && !this.versionComparator.isEqual(storeAppVersion, storeAppLatestVersion)) {
				storeAppGr.setValue("latest_version", storeAppVersion);
				storeAppGr.update();
			}
		}

	},

	_filterLocalApps: /*array*/function (/*array of hashes*/ updatesMap) {
		var localAppsGr = new GlideRecord("sys_app");
		localAppsGr.query();

		while(localAppsGr.next()) {
			var candidate_app_id = localAppsGr.sys_id.toString();
			if (!gs.nil(updatesMap[candidate_app_id])) {
				gs.info("Removing local app {0} from the list", updatesMap[candidate_app_id].app_name);
				delete updatesMap[candidate_app_id];
			}
		}

	},
	
	_filterAndUpdateAppRecords: function(update, /*[sys_store_app/sys_remote_app]*/app) {
		var propertiesToCompare = ["latest_version", "dependencies", "price_type", "lob", "indicators", "display_message", "compatibilities",
			"short_description", "name", "is_store_app", "block_install", "block_message", "upload_info", "needs_app_engine_licensing", "custom_table_count", "products"];

		gs.debug("Checking app update {0}:{1} ({2})", update.scope, update.relevant_version, update.source_app_id);
		var includeUpdate = false;
		var includeReason = null;

		if (app === null) {
			includeUpdate = true;
			includeReason = "New app";
			app = this._createRemoteApp(update);
		} else if (!this._areEqualBoolean(app.shared_internally, update.shared_internally ? update.shared_internally : false)) {
			includeUpdate = true;
			includeReason = "Shared internally";
		} else if (app.isValidField('auto_update') &&
			update.hasOwnProperty('auto_update') &&
			!this._areEqualBoolean(app.auto_update, update.auto_update)) {
			includeUpdate = true;
			includeReason = "Auto update change";
		} else if (app.isValidField('uninstall_blocked') &&
			update.hasOwnProperty('uninstall_blocked') &&
			!this._areEqualBoolean(app.uninstall_blocked, update.uninstall_blocked)) {
			includeUpdate = true;
			includeReason = "Uninstall blocked change";
		} else if (app.isValidField('hide_on_ui') &&
			update.hasOwnProperty('hide_on_ui') &&
			!this._areEqualBoolean(app.hide_on_ui, update.hide_on_ui)) {
			includeUpdate = true;
			includeReason = "Hidden on ui change";
		} else if (app.isValidField('installed_as_dependency') &&
			update.hasOwnProperty('installed_as_dependency') &&
			!this._areEqualBoolean(app.installed_as_dependency, update.installed_as_dependency)) {
			includeUpdate = true;
			includeReason = "Installed as dependency change";
		}

		if (!includeUpdate) {
			for (var i = 0; i < propertiesToCompare.length; i++) {
				var propertyName = propertiesToCompare[i];
				if(!app.isValidField(propertyName)) continue;

				var appPropertyValue = app[propertyName];
				var updatePropertyValue = update[propertyName] || update[update.relevant_version][propertyName];

				if (propertyName == "lob" || propertyName == "indicators" || propertyName == "products")
					updatePropertyValue = updatePropertyValue ? JSON.stringify(updatePropertyValue) : "[]";

				if (propertyName == "name")
					updatePropertyValue = update.app_name;

				if (!this._areEqual(appPropertyValue, updatePropertyValue)) {
					includeUpdate = true;
					includeReason = "Property change: " + propertyName;
					break;
				}

			}
		}

		if (includeUpdate) {
			// update sys_store_app / sys_remote_app record
			gs.debug("Including app update {0}:{1} ({2}) - {3}", update.source_app_id, update.relevant_version, update.scope, includeReason);
			this._updateLatestVersionFields(update, app);
		}

		// update sys_app_version record
		this._refreshVersions(app, update);
	},

	_isDowngrade: /*boolean */ function(/*from version*/ currentVersion, /* to version */ targetVersion) {
		return this.versionComparator.isDowngrade(currentVersion, targetVersion);
	},

	_updateLatestVersionFields: /*boolean*/ function(/*Hash*/ update, app) {
		if (app.getRecordClassName() == "sys_store_app" && !this._areEqual(app.version, update.relevant_version)){
			gs.info("No need to update values, local app is a different version. Updating only relevant fields.");
			app.setValue("is_store_app", update.is_store_app);
			app.setValue("auto_update", update.auto_update);
			app.setValue("latest_version", update.latest_version);
			app.setValue("products", JSON.stringify(update.products || []));
			app.setValue("shared_internally", update.shared_internally ? update.shared_internally : false);
			app.setValue("uninstall_blocked", update.uninstall_blocked);
			app.setValue("hide_on_ui", update.hide_on_ui);
			app.setValue("installed_as_dependency", update.installed_as_dependency);
			app.update();
			return;
		}
		this._updateApp(app, update);
	},

	_updateApp: /*void*/ function(/*GlideRecord sys_remote_app | sys_store_app*/ app, /*{}*/ update) {
		app.setValue("latest_version", update.latest_version);
		app.setValue("needs_app_engine_licensing", update[update.relevant_version].needs_app_engine_licensing);
		app.setValue("custom_table_count", update[update.relevant_version].custom_table_count);
		app.setValue("name", update.app_name);
		app.setValue("dependencies", update[update.relevant_version].dependencies);
		if (update.short_description)
			app.setValue("short_description", update[update.relevant_version].short_description);
        app.setValue("compatibilities", update[update.relevant_version].compatibilities);
        app.setValue("is_store_app", update[update.relevant_version].is_store_app);
        app.setValue("shared_internally", update.shared_internally ? update.shared_internally : false);
		app.setValue("price_type", update[update.relevant_version].price_type ? update[update.relevant_version].price_type : "");
		app.setValue("lob", (JSON.stringify(update[update.relevant_version].lob) || '[]'));
		app.setValue("indicators", (JSON.stringify(update[update.relevant_version].indicators) || '[]'));
		app.setValue("display_message", update[update.relevant_version].display_message ? update[update.relevant_version].display_message : "");
		app.setValue("upload_info", update[update.relevant_version].upload_info ? update[update.relevant_version].upload_info : "");
		app.setValue("products", JSON.stringify(update.products || []));
		if (app.isValidField("auto_update"))
			app.setValue("auto_update", update.auto_update);
        if (app.isValidField("block_install"))
            app.setValue("block_install", update[update.relevant_version].block_install);
        if (app.isValidField("block_message"))
            app.setValue("block_message", update[update.relevant_version].block_message);
		if (app.isValidField("delivery_source"))
			if(update[update.relevant_version].delivery_source)
				app.setValue("delivery_source",update[update.relevant_version].delivery_source);
			else
				app.setValue("delivery_source",'store');
		app.setValue("uninstall_blocked", update.uninstall_blocked);
		app.setValue("hide_on_ui",update.hide_on_ui);
		app.setValue("installed_as_dependency", update.installed_as_dependency);
		app.setWorkflow(true); // ensure workflow is enabled
		app.update();
	},

	_createRemoteApp: /*gliderecord*/ function(/*{sys_id,name,scope,version,description}*/ update) {
		gs.info("Creating sys_remote_app for: {0}", this.json.encode(update));
		var gr = new GlideRecord("sys_remote_app");
		gr.initialize();
		
		if (update.hasOwnProperty("source_app_id") && update.source_app_id) {
			gr.setValue("source_app_id", update.source_app_id);
			gr.setNewGuidValue(update.source_app_id);
		}
		
		gr.setValue("name", update.app_name);
		gr.setValue("scope", update.scope);
		gr.setValue("latest_version", update.latest_version || update.relevant_version);
		gr.setValue("vendor", update.vendor);
		if(update[update.latest_version].short_description)
			gr.setValue("short_description", update[update.latest_version].short_description);
		gr.setValue("dependencies", update[update.latest_version].dependencies);
		gr.setValue("compatibilities", update[update.latest_version].compatibilities);
		gr.setValue("is_store_app", update[update.latest_version].is_store_app);
		gr.setValue("block_install", update[update.latest_version].block_install);
		gr.setValue("block_message", update[update.latest_version].block_message);
		gr.setValue("is_offline_app",update.is_offline_app);
		gr.setValue("needs_app_engine_licensing", update[update.latest_version].needs_app_engine_licensing);
		gr.setValue("custom_table_count", update[update.latest_version].custom_table_count);
		
		if (gr.isValidField('auto_update'))
			gr.setValue("auto_update", update.auto_update);

		if (update[update.latest_version].has_demo_data == "true")
			gr.setValue("demo_data", "has_demo_data");
		else
			gr.setValue("demo_data", "no_demo_data");		
		
		if (gr.isValidField('publish_date'))
			gr.setValue("publish_date", update[update.latest_version].publish_date);
		if(gr.isValidField("sys_code"))
			gr.setValue("sys_code",update.sys_code);
		gr.setValue("uninstall_blocked",update.uninstall_blocked);
		gr.setValue("hide_on_ui",update.hide_on_ui);
		gr.setValue("installed_as_dependency", update.installed_as_dependency);
		gr.insert();
		return gr;
	},
	
	_constructConnectMessage: function(filters, linkText, count) {
		var filterString = '';
		var lengthOfFilters = filters.length -1;
		for(var filterCategory = 0;  filterCategory < filters.length; filterCategory++){
			filterString += filters[filterCategory].category + "=" + filters[filterCategory].id;
			if(filterCategory <  filters.length -1)
				filterString += "^";
		}

                return "[code]<a href='/nav_to.do?uri=/$allappsmgmt.do?sysparm_filter=" + filterString + "'>" + linkText + "<a>[/code]" + " (" + count + ")\n";
	},

	//Send connect chat messages to all admin users only
	_sendPushNotification: function() {
		var groupName = this.NOTIFICATION_GROUP_NAME;
		var groupGr = new GlideRecord("live_group_profile");
		groupGr.addQuery("name", groupName);
		groupGr.query();
		if (!groupGr.next()) {
			groupGr.setValue("name", groupName);
			groupGr.setValue("public_group", false);
			groupGr.setValue("visible_group", false);
			groupGr.setValue("type", "connect");
			groupGr.insert();
		}
		var collaborationManager = sn_connect.Conversation.get(groupGr.sys_id);
		var users = new GlideRecord('sys_user_has_role');
		users.addQuery('role', '2831a114c611228501d4ea6c309d626d');
		users.addQuery('user.active', true);
		users.query();
		while (users.next()) {
			collaborationManager.addSubscriber(users.user, true);
		}

		var connectMessage = gs.getMessage("Below store apps require attention:") + "\n";

		Object.keys(this.appNotificationConfig).forEach(function(item){
			if(this.appNotificationConfig[item]["count"] > 0)
				connectMessage += this._constructConnectMessage(this.appNotificationConfig[item]["filter"], this.appNotificationConfig[item]["linkText"], this.appNotificationConfig[item]["count"]);
		},this);

		collaborationManager.sendMessage(connectMessage);
	},

	_checkIndicatorsCountForInstalledAppsWithNoStoreData: function(updatesMap) {
		var app = new GlideRecord('sys_store_app');
		app.addActiveQuery();
		app.addNotNullQuery('version');
		app.addQuery("sys_id", "NOT IN", updatesMap);
		app.addQuery("indicators", "CONTAINS", "trial_deactivation_requested");
		app.query();
                var rowCountForDeactivatedApps = app.getRowCount();
		this.appNotificationConfig["appDeactivationRequests"]["count"] += rowCountForDeactivatedApps;

		var gr = new GlideRecord('sys_store_app');
		gr.addActiveQuery();
		gr.addNotNullQuery('version');
		gr.addQuery("sys_id", "NOT IN", updatesMap);
		gr.addQuery("indicators", "CONTAINS", "entitlement_revoked");
		gr.query();
                var rowCountForEntRevokedApps = app.getRowCount();
		this.appNotificationConfig["appEntitlementRevoked"]["count"] += rowCountForEntRevokedApps;
	},
	
	_checkAndUpdatePushNotificationCount: function(versionObject, parentAppObject, notificationTracker) {
		if(versionObject.indicators) {
			for(var i = 0; i < versionObject.indicators.length; i++) {
				if(versionObject.indicators[i].id == this.ENTITLEMENT_REVOKED)
					this.appNotificationConfig["appEntitlementRevoked"]["count"]++;
				if(versionObject.indicators[i].id == this.TRIAL_DEACTIVATION_REQUESTED)
					this.appNotificationConfig["appDeactivationRequests"]["count"]++;
			}
		}
		if((parentAppObject.getRecordClassName() == "sys_store_app") && this.versionComparator.isUpgrade(parentAppObject.getValue("version"), versionObject.version) && !notificationTracker.isUpdateAvailableChecked) {
			this.appNotificationConfig["appAvailableForUpdate"]["count"]++;
			notificationTracker.isUpdateAvailableChecked = true;
		}
			
		if(parentAppObject.getRecordClassName() == "sys_remote_app" && parentAppObject.shared_internally == false && !notificationTracker.isInstallationAvailableChecked) {
			this.appNotificationConfig["appAvailableForInstall"]["count"]++;
			notificationTracker.isInstallationAvailableChecked = true;
		}
	},
	
	_refreshVersions : /*void*/ function(/*GlideRecord sys_store_app | sys_remote_app */app, /*{}*/ update) {
		//update is the app object which has all the version info
		var appField = (app.getRecordClassName() == "sys_store_app")  ? "store_application" : "remote_application";
		var gr = new GlideRecord("sys_app_version");
		gr.addQuery("source_app_id", update.source_app_id);
		gr.query();
		
		while(gr.next()) {
			if (app.isValidField("version") && !this.versionComparator.isUpgrade(app.getValue("version"), gr.getValue("version"))) {
				gs.info("Deleting unneeded app version {0} for app {1}", gr.getValue("version"), app.getValue("sys_id"));
				gr.deleteRecord();
			}
		}
		
		var notificationUpdateTracker = {
			isUpdateAvailableChecked : false,
			isInstallationAvailableChecked : false
		};

		//run through and create new records or update existing ones
		for (var prop in update) {
			if(gs.nil(update[prop]) || gs.nil(update[prop].version)) continue;

			//we should only store those which are an upgrade
			version = update[prop];
			gs.debug("Saving or updating sys_app_version record for {0} : {1} ({2})", app.getValue("name"), version.version, app.getValue("sys_id"));
			if (app.isValidField("version") && !this.versionComparator.isUpgrade(app.getValue("version"), version.version))
				continue;
			if(this.canSendNotification)
				this._checkAndUpdatePushNotificationCount(version, app, notificationUpdateTracker);
			gr.initialize();
			gr.addQuery("source_app_id", app.getValue("sys_id"));
			gr.addQuery("version", version.version);
			gr.query();
			
			if (!gr.next())
				gr.newRecord();
			
			gr.setValue(appField, app.getValue("sys_id"));
			gr.setValue("source_app_id", update.source_app_id);
			gr.setValue("name", update.app_name);
			gr.setValue("title", version.title);
			gr.setValue("number", version.app_number);
			gr.setValue("scope", update.scope);
			gr.setValue("version", version.version);
			gr.setValue("vendor", update.vendor);
			gr.setValue("vendor_key",update.vendor_key);
			if(version.short_description)
				gr.setValue("short_description", version.short_description);
			gr.setValue("dependencies", version.dependencies);
            gr.setValue("compatibilities", version.compatibilities);
            gr.setValue("is_store_app", version.is_store_app);
            gr.setValue("price_type", version.price_type ? version.price_type : "");
            gr.setValue("lob", (JSON.stringify(version.lob) || '[]'));
            gr.setValue("indicators", (JSON.stringify(version.indicators) || '[]'));
            gr.setValue("display_message", version.display_message ? version.display_message : "");
            gr.setValue("publish_date", version.publish_date);
            gr.setValue("auto_update", update.auto_update);
            gr.setValue("upload_info", version.upload_info ? version.upload_info : "");
            gr.setValue("custom_table_count", version.custom_table_count);
            gr.setValue("needs_app_engine_licensing", version.needs_app_engine_licensing);
			if(gr.isValidField('delivery_source'))
				if(version.delivery_source)
					gr.setValue('delivery_source',version.delivery_source);
				else
					gr.setValue('delivery_source','store');
            if (gr.isValidField('block_install'))
              gr.setValue("block_install", version.block_install);

            if (gr.isValidField('block_message'))
              gr.setValue("block_message", version.block_message);

			if (version.has_demo_data == "true")
				gr.setValue("demo_data", "has_demo_data");
			else
				gr.setValue("demo_data", "no_demo_data");		
			gr.setValue("uninstall_blocked", version.uninstall_blocked);
			gr.setValue("hide_on_ui", version.hide_on_ui);
			gr.setValue("installed_as_dependency", version.installed_as_dependency);
			if (gr.isNewRecord())
				gr.insert();
			else
				gr.update();
		}
	},

	_getApp: /*GlideRecord sys_store_app | sys_remote_app */ function(/*string*/ sys_id) {
		var gr = new GlideRecord("sys_store_app");
        gr.addActiveQuery();
		gr.addQuery("sys_id", sys_id);
		gr.query();
		if (gr.next())
			return gr;
		
		gr = new GlideRecord("sys_remote_app");
		gr.addQuery("sys_id", sys_id);
		gr.query();
		if (gr.next())
			return gr;
		
		return null;
	},
	
	_removeWithdrawnAppVersions: function(updatesMap) {
		var app_version = new GlideRecord("sys_app_version");
		app_version.query();

        while (app_version.next()) {
            var appId = app_version.getValue("source_app_id");
            var currentVersion = app_version.getValue("version");

            if (gs.nil(updatesMap[appId]) || gs.nil(updatesMap[appId][currentVersion])) {
                gs.debug("Deleting sys_app_version record {0} : {1} ({2}) because it is not in the updates sent from the store.",
                    app_version.getValue("name"), currentVersion, app_version.getValue("number"));
                app_version.deleteRecord();
            }
        }
		
	},

	/**
 
* Description: queries on sys_offline_app table and data massaging will be done to mimic the store payload
* Returns: updates(offline apps from sys_offline_app table)
*/
	_getOfflineUpdates : function(){
		var updates = [];
		var offlineAppsJson = this._buildOfflineApps();
		var isVersionExists = false;
		for (var key in offlineAppsJson)
			updates.push(offlineAppsJson[key]);
		gs.debug("Got ({0}) candidate updates: {1}", updates.length, this.json.encode(updates));
		return {
			opstatus : 1,
			data : updates
		};
	},
	
	_buildOfflineApps : function(){
		var offlineApps = {};
		var scopename;
		var offlineAppsGr = new GlideRecord("sys_offline_app");
		offlineAppsGr.query();
		while(offlineAppsGr.next()){
			scopename = offlineAppsGr.getValue('scope');
			if(!offlineApps.hasOwnProperty(scopename)){
				offlineApps[scopename] = {};
				offlineApps[scopename]['scope'] = offlineAppsGr.getValue('scope');
				offlineApps[scopename]['app_name'] = offlineAppsGr.getValue('name');
				offlineApps[scopename]['source_app_id'] = offlineAppsGr.getValue('source_app_id');
				offlineApps[scopename]['vendor'] = offlineAppsGr.getValue('vendor');
				offlineApps[scopename]['vendor_key'] = offlineAppsGr.getValue('vendor_prefix');
				offlineApps[scopename]['auto_update'] = false;
				offlineApps[scopename]['shared_internally'] = false;
				offlineApps[scopename]['latest_version'] = offlineAppsGr.getValue('latest_version');
				offlineApps[scopename]['is_store_app'] =	true;
				offlineApps[scopename]['indicators'] = new global.JSON().decode(offlineAppsGr.getValue("indicators")) ? new global.JSON().decode(offlineAppsGr.getValue("indicators")) : [];
				offlineApps[scopename]['display_message'] = offlineAppsGr.getValue('display_message') || "";
				offlineApps[scopename]['sys_code'] = offlineAppsGr.getValue('sys_code');
				offlineApps[scopename]['products'] = JSON.parse(offlineAppsGr.getValue('products') || "[]");
				if(offlineAppsGr.isValidField('uninstall_blocked'))
					offlineApps[scopename]['uninstall_blocked'] = offlineAppsGr.uninstall_blocked.toString() == 'true'? true: false;
				if(offlineAppsGr.isValidField('hide_on_ui'))
					offlineApps[scopename]['hide_on_ui'] = offlineAppsGr.hide_on_ui.toString() == "true" ? true : false;
				if(offlineAppsGr.isValidField('installed_as_dependency'))
					offlineApps[scopename]['installed_as_dependency'] = offlineAppsGr.installed_as_dependency.toString() == "true" ? true : false;
				offlineApps[scopename]['needs_app_engine_licensing'] = offlineAppsGr.needs_app_engine_licensing ? true : false;
				offlineApps[scopename]['custom_table_count'] = offlineAppsGr.getValue("custom_table_count");
			}
			this._addOrCreateVersionForOfflineApp(offlineApps,scopename,offlineAppsGr);
		}
		return offlineApps;
	},
	
	_addOrCreateVersionForOfflineApp : function(offlineAppsJson,scope,offlineAppsGr){
		
		if(!offlineAppsJson[scope].hasOwnProperty('versions')){ 
			// add version of the new entry to existing version because there is another entry with different version in offline app 
			offlineAppsJson[scope]['versions'] = [];
		}
		
       //stamp latestversion of offlineapp with current identified version if its latest
		
		if(offlineAppsJson[scope]['latest_version'] != offlineAppsGr.getValue('latest_version')){
				if(this.versionComparator.isUpgrade(offlineAppsJson[scope]['latest_version'],offlineAppsGr.getValue('latest_version'))){
					
					offlineAppsJson[scope]['latest_version'] = offlineAppsGr.getValue('latest_version');
					
				}
			}
		
		offlineAppsJson[scope]['versions'].push({
			'short_description' : offlineAppsGr.getValue("short_description"),
			'key_features' : offlineAppsGr.getValue("key_features"),
			'has_demo_data' : (offlineAppsGr.getValue("demo_data") == 'has_demo_data')? "true" : "false",
			'is_store_app' : true,
			'title' :  offlineAppsGr.getValue("name"),
			'release_notes' :offlineAppsGr.getValue("release_notes"),
			'version': offlineAppsGr.getValue("latest_version"),
			'compatibilities': offlineAppsGr.getValue("compatibilities"), 
			'auto_update':false,
			'dependencies': offlineAppsGr.getValue("dependencies")? offlineAppsGr.getValue("dependencies") : '',
			'publish_date' : offlineAppsGr.getValue("publish_date"),
			'price_type' : offlineAppsGr.getValue("price_type"),
			'indicators': new global.JSON().decode(offlineAppsGr.getValue("indicators")) ? new global.JSON().decode(offlineAppsGr.getValue("indicators")) : [],
			'display_message': offlineAppsGr.getValue('display_message') || "",
			'delivery_source': offlineAppsGr.getValue('delivery_source'),
			'lob' : new global.JSON().decode(offlineAppsGr.getValue("lob")) ? new global.JSON().decode(offlineAppsGr.getValue("lob")) : [],
			'uninstall_blocked' : (offlineAppsGr.isValidField('uninstall_blocked') && offlineAppsGr.uninstall_blocked.toString() == 'true') ? true: false,
			'hide_on_ui' : (offlineAppsGr.isValidField('hide_on_ui') && offlineAppsGr.hide_on_ui.toString() == "true") ? true : false,
			'installed_as_dependency' : (offlineAppsGr.isValidField('installed_as_dependency') && offlineAppsGr.installed_as_dependency.toString() == "true") ? true : false,
			'needs_app_engine_licensing': offlineAppsGr.needs_app_engine_licensing ? true : false,
			'custom_table_count': offlineAppsGr.getValue("custom_table_count"),
			'lob' : new global.JSON().decode(offlineAppsGr.getValue("lob")) ? new global.JSON().decode(offlineAppsGr.getValue("lob")) : []
		});
		
	},
		
	_deleteAllVersions: function (/*string*/ appId) {
		gs.debug("Deleting all app versions for source app {0}", appId);
		var app_versions = new GlideRecord("sys_app_version");
		app_versions.addQuery("source_app_id", appId);
		app_versions.query();
			
		gs.debug("Number of version records to delete: {0}", app_versions.getRowCount());
		app_versions.deleteMultiple();	
	},
		
	_deleteHigherVersions: function (/*string*/ appId,/*string*/ highestPossibleVersion) {
		if (!highestPossibleVersion)
			return;
			
		gs.debug("Deleting app versions for appId {0} higher than {1}", appId, highestPossibleVersion);
			
		var app_versions = new GlideRecord("sys_app_version");
		app_versions.addQuery("source_app_id",appId);
		app_versions.query();
			
		while (app_versions.next()) {
			if (this.versionComparator.isUpgrade(highestPossibleVersion, app_versions.getValue("version"))) {
				gs.debug("Deleting sys_app_version record for {0} version {1} because it is higher than the newest version ({2})",
						 app_versions.getValue("name"), app_versions.getValue("version"), highestPossibleVersion);
						
				app_versions.deleteRecord();
			}
		}
	},
	
	_versionArrayContains : /*boolean*/ function(/*[{}]*/ versionArray,/*string*/ appId) {
		for (var i = 0; i< versionArray.length; i++) {
			var newestVersion = versionArray[i];
			if (newestVersion.source_app_id == appId)
				return true;
		}
		return false;
	},
	
	_versionArrayContainsVersion: /*boolean*/ function( /*[{}]*/ versionArray,/*string*/ appId,/*string*/ version) {
		for (var i = 0; i< versionArray.length; i++) {
			var versionData = versionArray[i];
			if (versionData.source_app_id == appId && versionData.version == version)
				return true;
		}
		return false;
	},
	
	_setRelevantVersion: function(update, app) {
		if(!update.hasOwnProperty("latest_version") || gs.nil(update.latest_version))
			update.latest_version = this._getLatestVersionForUpdate(update);

		var isAppInstalled = app && app.getRecordClassName() == "sys_store_app";
		update.relevant_version  = (isAppInstalled && !gs.nil(update[app.getValue("version")])) ? app.getValue("version") : update.latest_version;
	},
	
	_getLatestVersionForUpdate: function(update) {
		var versionList = [];
		for(var prop in update) {
			if(!gs.nil(update[prop]) && !gs.nil(update[prop].version))
				versionList.push(update[prop].version);
		}
		return new VersionComparator().getLatestVersion(versionList);
	},

	_getHighestVersionNumber: /*{}*/ function(/*string*/ appId, /*[{}]*/ highestVersions) {
		for (var i = 0; i< highestVersions.length; i++) {
			var newestVersion = highestVersions[i];
			if (newestVersion.source_app_id == appId)
				return newestVersion.version;
		}
		gs.debug("No versions found for {1}", appId);
		return false;
	},
	
	_getManifestsAsync: function() {
		//we'll let this happen async
		gs.eventQueue("sn_appclient.update.manifests","","","","");
	},
	
	_areEqual: /*Boolean*/ function(a, b) {
		if (gs.nil(a) && gs.nil(b))
			return true;
		
		return (a+'') == (b+'');
	},
	
	_areEqualBoolean: /*Boolean*/ function(a, b) {
		if (gs.nil(a) && gs.nil(b))
			return true;
		
		a = gs.nil(a) ? "false" : a+'';
		if (a == "true")
			a = "1";
		else if (a+'' == "false")
			a = "0";		

		b = gs.nil(b) ? "false" : b+'';
		if (b == "true")
			b = "1";
		else if (b == "false")
			b = "0";
		
		return a == b;
	},
	
    type: 'UpdateChecker'
};
```