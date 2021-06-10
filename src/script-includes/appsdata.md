---
title: "AppsData"
id: "appsdata"
---

API Name: sn_appclient.AppsData

```js
var AppsData = Class.create();
AppsData.prototype = {
	
	CANNOT_READ_MESSAGE : "Insufficient privileges to read records from table {0}",
		
	initialize: function() {
		this.versionComparator = new VersionComparator();
		this.domainName = new ScopedAppRepoRequest().getUploadUrl();
		this.validScopeKeys = gs.getProperty("sn_appauthor.all_company_keys", gs.getProperty("glide.appcreator.company.code")).split(",");
		/*Add "x_ to all valid scope keys"*/
		this.validScopeKeys = this.validScopeKeys.map(function(key, index) {
			var validScopeTemplate = "x_{0}_";
			return validScopeTemplate.replace("{0}", key.toLowerCase());
		});
		this.validScopeKeys.push("sn_");
		this.validScopeKeys.push("global");
		this.instanceId = gs.getProperty("instance_id");
		this.storeDetailButtons = {
			"get": gs.getMessage("Get"),
			"buy": gs.getMessage("Buy"),
			"try": gs.getMessage("Try"),
			"request-app": gs.getMessage("Request App"),
			"request-trial": gs.getMessage("Request Trial"),
			"request-demo": gs.getMessage("Request a Demo"),
			"app-requested": gs.getMessage("App Requested"),
			"app-request-rejected": gs.getMessage("App Request Rejected"),
			"purchased": gs.getMessage("Purchased"),
			"trial-requested": gs.getMessage("Trial Requested"),
			"trial-rejected": gs.getMessage("Trial Rejected"),
			"trial-expiry-date": gs.getMessage("Trial Expires in "),
			"trial-expired": gs.getMessage("Trial Expired"),
			"trial-deactivated": gs.getMessage("Trial Deactivated"),
			"quote-requested": gs.getMessage("Quote Requested"),
			"purchase-with-po": gs.getMessage("Purchase with PO"),
			"cancel-quote": gs.getMessage("Cancel Quote"),
			"resend-quote": gs.getMessage("Resend Quote"),
			"po-submitted": gs.getMessage("PO Submitted"),
			"complete-purchase": gs.getMessage("Complete Purchase"),
			"view-company-profile": gs.getMessage("View Company Profile"),
			"request-install": gs.getMessage("Request Install"),
			"view-requests": gs.getMessage("View Requests"),
			"contact-seller": gs.getMessage("Contact Seller"),
			"view-product": gs.getMessage("View Products")
		};
		this.indicatorMessages = {
			"service_graph_certified": gs.getMessage("Service Graph Certified"),
			"submitted_purchase_order": gs.getMessage("Processing Submitted Purchase Order"),
			"pending_purchase_status": gs.getMessage("Please Complete Purchase in Store"),
			"expecting_purchase_order": gs.getMessage("Expecting Purchase Order"),
			"approved_purchase_request": gs.getMessage("Approved Purchase Request"),
			"approved_trial_request": gs.getMessage("Approved Trial Request"),
			"processing_purchase_request": gs.getMessage("Processing Purchase Request"),
			"processing_trial_request": gs.getMessage("Processing Trial Request"),
			"processing_quote_request": gs.getMessage("Processing Quote Request"),
			"rejected_purchase_request": gs.getMessage("Rejected Purchase Request"),
			"rejected_trial_request": gs.getMessage("Rejected trial request"),
		};
		this.storeFilterIndicators = this.generateFilterIndicatorObject();
	},

	generateFilterIndicatorObject: function() {
		var indicatorObj = {};
		var i = 0;
		for (var indicator in this.indicatorMessages) {
			indicatorObj[indicator] = {
				id: indicator,
				message: this.indicatorMessages[indicator],
				order: i
			};
			i++;
		}
		return indicatorObj;
	},

/*
   Connect to store to get all store apps. This payload includes
   1. All store apps in e-commerce interface
   2. Recommended store apps.
   */
	getAllStoreApps: function() {
        if(gs.getProperty("sn_appclient.client_calls_allowed","false") == "false" || gs.getProperty("sn_appclient.app.install.offline","true") == "true") {
                gs.info("getAllStoreApps returning without calling repo as client_calls_allowed is false");
                return {data: {}};
        }
	
	    var allStoreAppsRequest = new ScopedAppRepoRequest("get_store_apps");
	        allStoreAppsRequest.setParameter("instance_id", gs.getProperty("instance_id")),
	        candidateStoreApps = allStoreAppsRequest.post(),
	        allStoreAppsRequestStatusCode = allStoreAppsRequest.getStatusCode(),
	        response = {data: {}};
	    if(allStoreAppsRequestStatusCode == 200) {
	        response.data = new global.JSON().decode(candidateStoreApps);
		this.localizeFilterIndicators(response.data);
	    }
	    response.statusCode = allStoreAppsRequestStatusCode;
	    return response;
	},

	localizeFilterIndicators: function(data) {
		if (data.errors) {
			gs.error(data.message + " : " + data.errors[0]);
			return;
		}

		data.forEach(function(app) {
			if(app.filterIndicators)
				app.filterIndicators.forEach(function(indicator, index) {
					app.filterIndicators[index] = this.storeFilterIndicators[indicator] ? this.storeFilterIndicators[indicator] : indicator;
				}, this);
		}, this);
	},
	
	getStoreFilters: function() {
        if(gs.getProperty("sn_appclient.client_calls_allowed","false") == "false" || gs.getProperty("sn_appclient.app.install.offline","true") == "true") {
                gs.info("getStoreFilters returning without calling repo as client_calls_allowed is false");
                return {data: {}};
        }
	
	    var allStoreFilters = new ScopedAppRepoRequest("get_store_filters");
	        allStoreFilters.setParameter("instance_id", gs.getProperty("instance_id")),
	        candidateStoreApps = allStoreFilters.post(),
	        allStoreFiltersStatusCode = allStoreFilters.getStatusCode(),
	        response = {data: {}};
	    if(allStoreFiltersStatusCode == 200)
	        response.data = new global.JSON().decode(candidateStoreApps);
	    response.statusCode = allStoreFiltersStatusCode;
	    return response;
	},
	
	getIndicatorFilters: function(){
		var request = new ScopedAppRepoRequest("get_all_indicators");
		var indicators = new global.JSON().decode(request.get());
		var error = request.getErrorMessage();
		if(error || !indicators || indicators.length <= 0) {
			gs.error("Unable to get list of app indicators. Response status: {0}", request.getStatusCode());
			return null;
		}

		var indicatorFilters = {
			name: gs.getMessage("Indicators"),
			filters: []
		};

		for(var indicator in indicators) {
			indicatorFilters.filters.push({
				lob_id: indicators[indicator].id,
				lob_name: indicators[indicator].message,
				assertion: "(app.all_indicators) ? app.all_indicators['" + indicators[indicator].id + "'] == true : false",
				order: indicators[indicator].order
			});
		}

		return indicatorFilters;
	},

	getAllApps: function(){
        new UpdateChecker().checkAvailableUpdates();
		var apps = [];
		this._addNewApps(apps);
		this._addInstalledApps(apps);
		var custom = [];
		this._addCustomApps(custom);
		return {
			data: apps,
			custom: custom
		};
	},

    getCustomApps: function(){
        var custom = [];
        this._addCustomApps(custom);
        return {
        	custom: custom
        };
    },
	
	getAllAppsWithVersions: function(sharedInternally, isFirstLoad, hideOnUiAppScope){
	
        var repostarttime = new GlideDateTime().getNumericValue();
        /*Do not call store API on first load*/
        if(isFirstLoad)
            var storeSyncTrackerId = this.checkUpdatesFromStore();
       		
        var repoendtime = new GlideDateTime().getNumericValue();
        var starttime = new GlideDateTime().getNumericValue();
		var apps = [];
              this.hideOnUiAppScope = hideOnUiAppScope;
		var inActiveAppSysIdMap = this._addInactiveInstalledApps(apps, sharedInternally);
		this._addNewApps(apps, sharedInternally, inActiveAppSysIdMap);
        this._addInstalledApps(apps, sharedInternally);
		this._addVersionsToApps(apps);
        var endtime = new GlideDateTime().getNumericValue();
		return {
			data: apps,
			appServer: gs.getProperty("sn_appclient.store_base_url", "http://localhost:8080/"),
            dataProcessingTime: endtime - starttime,
            repoProcessingTime: repoendtime - repostarttime,
            storeURL: this.domainName,
            storetrackerId: storeSyncTrackerId
		};
	},
	
	_addNewApps: function(/*[]*/ apps, sharedInternally, inActiveAppSysIdMap) {
		var appDetails = new GlideRecordSecure('sys_remote_app');
		appDetails.addQuery("shared_internally", sharedInternally);
        appDetails.orderByDesc('sys_created_on');
        appDetails.query();
        gs.debug("Including {0} new apps from {1}:{2}",
        appDetails.getRowCount(),
        appDetails.getRecordClassName(),
        appDetails.getEncodedQuery());
        while(appDetails.next()) {
            if (this.isVisible(appDetails)){
		var app = this._getAppDetails(appDetails);
		if(inActiveAppSysIdMap[app.sys_id])
		   app.is_uninstalled_with_retain_data = true;
                apps.push(app);
	    }
			
        }
		
		// Assumes no store app is ever deleted from the store
		appDetails = new GlideRecordSecure('sys_store_app');
        appDetails.addActiveQuery();
        appDetails.addNullQuery('version');
        appDetails.addQuery("shared_internally", sharedInternally);
        appDetails.orderByDesc('sys_created_on');
        appDetails.query();
        gs.debug("Including {0} new (inactive and not yet installed) apps from {1}:{2}",
        appDetails.getRowCount(),
        appDetails.getRecordClassName(),
        appDetails.getEncodedQuery());
        while(appDetails.next()) {
            if (this.isVisible(appDetails))
                apps.push(this._getAppDetails(appDetails));
        }
	},
	
	_addInstalledApps: function(/*[]*/ apps, sharedInternally) {
		var appDetails = new GlideRecordSecure('sys_store_app');
        if(sharedInternally){
        	appDetails.addQuery("shared_internally",sharedInternally);
        }else{
        	var gc = appDetails.addNullQuery("shared_internally");
        	gc.addOrCondition("shared_internally",sharedInternally);
        }
        appDetails.addActiveQuery();
        appDetails.addNotNullQuery('version');
        appDetails.orderByDesc('update_date');
        appDetails.query();
        gs.debug("Including {0} installed apps from {1}:{2}",
        appDetails.getRowCount(),
        appDetails.getRecordClassName(),
        appDetails.getEncodedQuery());
        while(appDetails.next()) {
            if (this.isVisible(appDetails))
                apps.push(this._getAppDetails(appDetails));
        }
	},
	
    _addInactiveInstalledApps: function(/*[]*/ apps, sharedInternally) {
    	  var inActiveAppSysIdMap = {};
        var appDetails = new GlideRecordSecure('sys_store_app');
        var appDetailsBuilder = appDetails.addQuery("shared_internally", sharedInternally);
        if(!sharedInternally)
            appDetailsBuilder.addOrCondition("shared_internally", "=", "NULL");
        appDetails.addQuery("active", false);
        appDetails.addNotNullQuery('version');
        appDetails.orderByDesc('update_date');
        appDetails.query();
        while(appDetails.next()) {
	      var isRemoteUpdateAvailable = this._isRemoteUpdateAvailable(appDetails);
	      var isVisible = this.isVisible(appDetails);
            if (!isRemoteUpdateAvailable && isVisible)
                apps.push(this._getAppDetails(appDetails));
            else if (isRemoteUpdateAvailable && isVisible)
            	 inActiveAppSysIdMap[appDetails.getValue("sys_id")] = true;
        }
        return inActiveAppSysIdMap;
    },
	
    _isRemoteUpdateAvailable: function(appDetails) {
        var sysRemoteApp = new GlideRecord("sys_remote_app");
        sysRemoteApp.get(appDetails.getValue("sys_id"));
        
        return sysRemoteApp.isValid();
    },
    
    _addCustomApps: function(/*[]*/ custom) {
        var customApps = new GlideRecordSecure('sys_app');
        if(customApps.isValid()) {
            customApps.orderByDesc('sys_created_on');
            customApps.query();
            while(customApps.next()) {
                custom.push(this._getAppDetails(customApps));
            }
        } else {
            gs.info(gs.getMessage(this.CANNOT_READ_MESSAGE, 'sys_app'));
        }
    },

	_addVersionsToApps: function(/*array*/ apps) {
		var i;
		for(i=0; i<apps.length; i++) {
			app = apps[i];
			this._addAppVersions(app);
		}
	},

	_addAppVersions: function(/*{app}*/ app) {
		app.versions = [];
		var versions = new GlideRecord("sys_app_version");
		versions.addQuery("source_app_id", app.sys_id);
		versions.query();
		while (versions.next()) {
			var has_manifest = !gs.nil(versions.getValue("manifest")) && versions.manifest.contains('app_info');
            if(app.version && app.version == versions.getValue("version")) {
				app.has_manifest = has_manifest;
            } else if (app.latest_version && app.latest_version == versions.getValue("version")) {
				app.has_manifest = has_manifest;
            }
			//remember app is *NOT* a GlideRecord
			if (this.versionComparator.isDowngrade(app.version, versions.getValue("version")))
				continue;

			var tempObj = {};
			if(versions.isValidField('needs_app_engine_licensing'))
				tempObj.needs_app_engine_licensing = versions.needs_app_engine_licensing ? true : false;
			if(versions.isValidField('custom_table_count'))
				tempObj.custom_table_count = versions.custom_table_count.toString();
			tempObj.auto_update = versions.getValue("auto_update");
			tempObj.demo_data = versions.getValue("demo_data") == "has_demo_data" ? true : false;
			tempObj.dependencies = versions.getValue("dependencies");
			tempObj.name = versions.getValue("name");
			tempObj.number = versions.getValue("number");
			tempObj.publish_date = versions.getValue("publish_date");
			tempObj.publish_date_display = versions.getValue("publish_date");
			tempObj.remote_application = versions.getValue("remote_application");
			tempObj.scope = versions.getValue("scope");
			tempObj.short_description = versions.getValue("short_description");
			tempObj.source_app_id = versions.getValue("source_app_id");
			tempObj.sys_id = versions.getValue("sys_id");
			tempObj.title = versions.getValue("title");
			tempObj.vendor = versions.getValue("vendor");
			tempObj.vendor_key = versions.getValue("vendor_key");
			tempObj.version = versions.getValue("version");
			tempObj.block_install = versions.block_install ? true: false;
			tempObj.block_message = versions.getValue("block_message");
            tempObj.compatibilities = versions.compatibilities.toString();
			tempObj.version_display = this._getMajorAndMinorDisplayVersion(tempObj.version);
            tempObj.store_link = versions.getValue("is_store_app") ?
                    this._getStoreLink(tempObj.source_app_id, tempObj.version) : "";
			tempObj.has_manifest = has_manifest;
			//add a pretty display date for publish_date
			tempObj.price_type = versions.getValue("price_type") || "";
			tempObj.lob = new global.JSON().decode(versions.getValue("lob")) ? new global.JSON().decode(versions.getValue("lob")) : [];
			tempObj.indicators = new global.JSON().decode(versions.getValue("indicators")) ? new global.JSON().decode(versions.getValue("indicators")) : [];
			tempObj.display_message = versions.getValue("display_message") || "";
			tempObj.upload_info = versions.getValue("upload_info") || "";
			if (tempObj.publish_date) {
				var displayDate = new GlideClientDate();
				displayDate.setValue(tempObj.publish_date.toString());
				tempObj.publish_date_display = displayDate.getDisplayValue();
			}
			app.versions.push(tempObj);
		}

		var that = this;
		app.versions.sort(function (a, b) {
			if (that.versionComparator.isDowngrade(a.version, b.version))
				return 1;

			if (that.versionComparator.isUpgrade(a.version, b.version))
				return -1;

			if (that.versionComparator.isEqual(a.version, b.version))
				return 0;
		});


		for (var i=0; i<app.versions.length; i++) {
			app.versions[i].sortable_version = i + 1;
		}
	},


	_getProductsList: function(productFamilyList) {
		productFamilyList = JSON.parse(productFamilyList) || [];
		var products = [];
		for(var i in productFamilyList) {
			for(var j in productFamilyList[i].productList) {
				products.push(productFamilyList[i].productList[j]);
			}
		}
		return products;
	},

	_getAppDetails: function(/*GlideRecord sys_remote_app | sys_store_app*/ appDetails) {
		var tempobj = {};

		var logoid = new GlideRecord('sys_attachment');
		logoid.addQuery('table_sys_id', appDetails.sys_id.toString());
		logoid.addQuery('file_name', 'logo');
		logoid.query();
		if (logoid.next())
			tempobj.logo = logoid.sys_id.toString() + ".iix";

		tempobj.short_description = appDetails.short_description.toString();
		if(appDetails.isValidField('needs_app_engine_licensing'))
			tempobj.needs_app_engine_licensing = appDetails.needs_app_engine_licensing ? true : false;
		if(appDetails.isValidField('custom_table_count'))
			tempobj.custom_table_count = appDetails.custom_table_count.toString();
		tempobj.name = appDetails.name.toString();
		tempobj.vendor = appDetails.vendor.toString();
		tempobj.vendor_prefix = appDetails.vendor_prefix.toString();
		tempobj.link = this._checkAppIsProperlyInstalled(appDetails) ? this._getAppLink(appDetails) : ""; //Link to the app should be given only when app is propertly installed.
		tempobj.scope = appDetails.scope.toString();
		tempobj.compatibilities = appDetails.compatibilities ? appDetails.compatibilities.toString() : "" ;
		tempobj.active = appDetails.isValidField('active') ? appDetails.active.toString() == 'true' : false;
		tempobj.price_type = appDetails.getValue("price_type") || "" ;
		tempobj.lob = new global.JSON().decode(appDetails.getValue("lob")) ? new global.JSON().decode(appDetails.getValue("lob")) : [];
		tempobj.source = appDetails.getValue("sys_class_name") ? appDetails.getValue("sys_class_name") : "";
		tempobj.shared_internally = appDetails.getValue("shared_internally");
		tempobj.indicators = new global.JSON().decode(appDetails.getValue("indicators")) ? new global.JSON().decode(appDetails.getValue("indicators")) : [];
		tempobj.display_message = appDetails.getValue("display_message");
		tempobj.upload_info = appDetails.getValue("upload_info") || "";
		tempobj.products = this._getProductsList(appDetails.getValue("products"));

		if(appDetails.getTableName() == "sys_app")
			tempobj.side_loaded = this._checkForSideLoading(appDetails);
		

		var install_date = null;
		if (appDetails.isValidField('install_date') && !appDetails.install_date.nil()) {
			install_date = new GlideClientDate();
			install_date.setValue(appDetails.install_date);
		} else if (appDetails.isValidField('version') && !gs.nil(appDetails.version)) {
			install_date = new GlideClientDate();
			install_date.setValue(appDetails.sys_created_on);
		}

		var update_date = '';
		if (appDetails.isValidField('update_date') && !appDetails.update_date.nil()) {
			update_date = new GlideClientDate();
			update_date.setValue(appDetails.update_date);
		}

		tempobj.install_date = gs.nil(install_date) ? '' : install_date.getDisplayValue();
		tempobj.update_date = gs.nil(update_date) ? '' : update_date.getDisplayValue();

		if ('sys_remote_app' == appDetails.getRecordClassName()) {
			tempobj.version = "";
			tempobj.assigned_version = "";
			if (!gs.nil(appDetails.latest_version)) {
				tempobj.latest_version = appDetails.latest_version.toString();
				tempobj.latest_version_display = this._getMajorAndMinorDisplayVersion(appDetails.latest_version.toString());
			} else {
				tempobj.latest_version = tempobj.version;
			}
			tempobj.block_install = appDetails.block_install ? true: false;
			tempobj.block_message = appDetails.block_message.toString();
		} else {
			if(appDetails.guided_setup_guid && appDetails.guided_setup_guid.toString())
				tempobj.guided_setup_guid = appDetails.guided_setup_guid.toString();
			if (!gs.nil(appDetails.version)) {
				tempobj.version = appDetails.version.toString();
				tempobj.version_display = this._getMajorAndMinorDisplayVersion(appDetails.version.toString());
			} else
				tempobj.version = "";

			if (appDetails.isValidField('assigned_version') && !gs.nil(appDetails.assigned_version))
				tempobj.assigned_version = appDetails.assigned_version;
			else
				tempobj.assigned_version = tempobj.version;

			if (appDetails.isValidField('latest_version') && !gs.nil(appDetails.latest_version)) {
				gs.debug("App: {0} Latest version: {1} Version: {2} ", appDetails.name.toString(), appDetails.latest_version.toString(), appDetails.version.toString());
				tempobj.latest_version = appDetails.latest_version.toString();
				tempobj.latest_version_display = this._getMajorAndMinorDisplayVersion(appDetails.latest_version.toString());
				// if the versions are in fact different, the UI must show a difference
				if (tempobj.version != tempobj.latest_version && tempobj.version_display == tempobj.latest_version_display)
					tempobj.latest_version_display = tempobj.latest_version;

				gs.debug("tempobj is {0}", new global.JSON().encode(tempobj));
			} else {
				tempobj.latest_version = tempobj.version;
				tempobj.latest_version_display = tempobj.version_display;
				gs.debug("App: {0} Set latest version to {1} and display to {2} ", appDetails.name, tempobj.version, tempobj.version_display);

			}
		}

		tempobj.demo_data = appDetails.isValidField('demo_data')
			? appDetails.demo_data.toString()
		: '';
		tempobj.sys_id = appDetails.sys_id.toString();
		tempobj.sys_updated_on = appDetails.sys_updated_on.toString();
		tempobj.sys_created_on = appDetails.sys_created_on.toString();

		var storeVersion = tempobj.version ? tempobj.version : tempobj.latest_version;
        tempobj.is_store_app = appDetails.is_store_app ? true: false;
        tempobj.store_link = tempobj.is_store_app ? this._getStoreLink(tempobj.sys_id, storeVersion) : "";

		var createdOn = new GlideClientDate();
		createdOn.setValue(appDetails.sys_created_on.toString());
		tempobj.sys_created_on_display = createdOn.getDisplayValue();

		var updatedOn = new GlideClientDate();
		updatedOn.setValue(appDetails.sys_updated_on.toString());
		tempobj.sys_updated_on_display = updatedOn.getDisplayValue();

		var displayDate;
		if ('sys_store_app' == appDetails.getRecordClassName()) {
			tempobj.isSubscriptionApplicable = (gs.hasRole("admin") || gs.hasRole("maint")) && tempobj.needs_app_engine_licensing && GlideCustomTableUtils.getUnmappedTableCount("Application", appDetails.sys_id.toString()) > 0;
			if(tempobj.isSubscriptionApplicable)
				tempobj.inventoryURI = GlideCustomTableUtils.getInventoryURI("Application", appDetails.sys_id.toString());
			if (!appDetails.update_date.nil()) {
				displayDate = new GlideClientDate();
				displayDate.setValue(appDetails.update_date.toString());
				tempobj.publish_date_display = displayDate.getDisplayValue();
			}
			tempobj.isAppstorePlugin =  ["store","offline","out_of_band"].indexOf(appDetails.last_installed_from.toString()) != -1;
			tempobj.sys_code = appDetails.sys_code.toString();
		} else {
			displayDate = new GlideClientDate();
			var publishDate = appDetails.isValidField('publish_date')
			&& !appDetails.publish_date.nil() ? appDetails.publish_date.toString() : appDetails.sys_updated_on.toString();
			displayDate.setValue(publishDate);
			tempobj.publish_date_display = displayDate.getDisplayValue();
		}

		tempobj.can_install_or_upgrade = this._canInstallOrUpgrade(appDetails);
		tempobj.isInstalled = tempobj.active && !gs.nil(tempobj.version);
		if(tempobj.isInstalled){
			var isLatestVersionHigher = new VersionComparator().isUpgrade(tempobj.version, tempobj.latest_version);
			tempobj.isInstalledAndUpdateAvailable = isLatestVersionHigher && tempobj.can_install_or_upgrade;
		}
		if(appDetails.isValidField('uninstall_blocked'))
			tempobj.uninstall_blocked = appDetails.uninstall_blocked.toString() == 'true' ? true : false;
		if (appDetails.isValidField('installed_as_dependency'))
			tempobj.installed_as_dependency = appDetails.installed_as_dependency.toString() == "true" ?  true : false;
		gs.debug("Including " + appDetails.getRecordClassName() + ": " + new global.JSON().encode(tempobj));
		return tempobj;
	},
	
	_checkForSideLoading: function(app) {
		if(this.validScopeKeys.length === 0)
			return false;
		
		for( var keyIndex = 0; keyIndex < this.validScopeKeys.length; keyIndex++ ) {
			if(app.getValue("scope").toLowerCase().startsWith(this.validScopeKeys[keyIndex]))
				return false;
		}	
		
		return true;	
	},
	
	/*Redirect link to sys_store_app to handle apps that inactive in sys_store_app table and still have record in sys_remote_app */
	_getAppLink: function(appDetails) {
		var table = appDetails.getTableName();
		if(table == "sys_remote_app")
			table = "sys_store_app";  
		
		var link = "/" + table + ".do?sys_id=" + appDetails.sys_id
		
		return link;
	},

	_canInstallOrUpgrade: function(/*GlideRecord sys_remote_app | sys_store_app*/ appDetails) {
		if (GlidePluginManager.isActive("com.glide.app_api")) {
			if (typeof sn_app_api.AppStoreAPI.canInstallOrUpgrade != "undefined")
				return sn_app_api.AppStoreAPI.canInstallOrUpgrade(appDetails);
		}

		// admin or app_client_user is allowed to install or upgrade
		if (gs.hasRole('sn_appclient.app_client_user'))
			return true;

		return false;
	},

	_getMajorAndMinorDisplayVersion: function(val) {
		var ary = val.toString().split('.');
		if (ary.length <= 1)
			return val;

		if (ary[ary.length - 1].length >= 12)
			return val;

		if (ary.length >= 2 && ary[0] === 0 && ary[1] === 0)
			return val;

		while(ary[ary.length - 1] == 0)
			ary.pop();

		return ary.join('.');
	},

	_checkAppIsProperlyInstalled: function(appDetails) {
		var tableName = appDetails.getTableName();
		if (tableName == 'sys_remote_app') {
			var gr = new GlideRecord("sys_store_app");
			gr.get(appDetails.sys_id);
			if(gr.isValid() && !gr.active)
				return true;
			return false;
		}
		else if (tableName == 'sys_store_app') { // if app is aborted then also app is not properly installed so return false.
			if (appDetails.getValue('active') == '0') {
				var ga = new GlideAggregate('sys_metadata');
				ga.addQuery('sys_scope', appDetails.sys_id);
				ga.setGroup(false);
				ga.query();
				return ga.hasNext();
			}
		}
		return true;
	},

    _getStoreLink: function (source_app_id, version) {
        return this.domainName.replace("apprepo.service-now","store.servicenow") + "sn_appstore_store.do#!/store/application/"+source_app_id+"/"+version;
    },

    checkUpdatesFromStore : function() {
        var storeSyncTrackerId = this.isStoreSyncInProgress();
        if (!gs.nil(storeSyncTrackerId))
			return storeSyncTrackerId;
        var worker = new GlideScriptedHierarchicalWorker();
        worker.setProgressName("Checking store app updates");
        worker.setBackground(true);
        worker.setCannotCancel(true);
        worker.setScriptIncludeName("sn_appclient.UpdateChecker");
        worker.setScriptIncludeMethod("checkAvailableUpdates");
        worker.putMethodArg("isInteractive", true);
        worker.putMethodArg("honourChecksum", true);
        worker.start();
        return worker.getProgressID();
    },

    isStoreSyncInProgress : function(){
		var gr = new GlideRecord("sys_progress_worker");
		gr.addQuery("name","Checking store app updates");
		gr.addQuery("state","running");
		gr.setLimit(1);
		gr.query();
		if (gr.next()){
			return gr.getUniqueValue();
		}
		return "";
	},

    entitleApp: function(sourceAppId, version, requestType){
        if(this.isInstanceOffline())
         	return;
	var request = new ScopedAppRepoRequest('entitle_app_on_instance');
	request.setParameter('source_app_id', sourceAppId);
	request.setParameter('version', version);
	request.setParameter('request_type', requestType);
	request.setParameter('user_name', gs.getUserName());
	request.post();
	var response = {data:{}};
	response.data.sourceAppId = sourceAppId;
	response.data.version = version;
	response.message = request.message;
	response.statusCode = request.getStatusCode();
	return response;
    },
    getSubscribedProductForApp: function(sourceAppId, version){
        if(this.isInstanceOffline())
		return [];
	var request = new ScopedAppRepoRequest('entitle_app_on_instance');
	request.setParameter('source_app_id', sourceAppId);
	request.setParameter('request_type', 'get_subscribed_products');
	var subscribedProducts = new global.JSON().decode(request.post());
	var productURL = this.getProductURL();
	var response = {};
	for (var i = 0 ; i <  subscribedProducts.length ; i++)
		subscribedProducts[i].url = productURL + subscribedProducts[i].productId;
	response.productList = subscribedProducts;
	response.status = request.getStatusCode();
	return response;
   },
   getProductURL: function(){
	var productURL = new ScopedAppRepoRequest().getUploadUrl();
	return productURL.replace("apprepo.service-now" , "store.servicenow") + "/sn_appstore_store.do#!/store/product/";
   },
   isInstanceOffline: function(){
	return gs.getProperty("sn_appclient.app.install.offline" , "true") == "true";
   },

	getAppRecord: function(sys_id) {
		var gr = new GlideRecordSecure("sys_remote_app");
        	gr.addQuery("sys_id", sys_id);
		gr.addQuery("shared_internally", false);
		gr.query();
		if(gr.next())
		    return gr;

		gr = new GlideRecordSecure("sys_store_app");
		gr.addQuery("sys_id", sys_id);
		gr.addQuery("active", true);
		gr.addQuery("shared_internally", false);
		gr.query();
		if(gr.next())
		    return gr;

		return null;
	},
	
	updateAppStatusOnInstance: function(appData) {
		var sysId = appData.source_app_id ? appData.source_app_id : appData.id;
		var gr = this.getAppRecord(sysId);
		if(gr) {
			if(gr.getRecordClassName() == "sys_store_app")
				appData.isAppUpdateAvailable = new VersionComparator().isUpgrade(appData.version, appData.latest_version) ?  this._canInstallOrUpgrade(gr) : false;
			if(gr.getRecordClassName() == "sys_remote_app")
				appData.isAppInstallationAvailable = true;
			appData.isAppEntitledForInstance = true;
			appData.isAppCompatible = true;
			appData.appUrl = "$allappsmgmt.do?sysparm_search==" + gr.scope;
		}else
			appData.appUrl = this._getStoreLink(sysId, appData.version);
	},
	
	updateDependentAppStatusOnInstance: function(dependentApp) {
		if(!dependentApp.app_list)
			return;
		
		dependentApp.app_list.forEach(function(app) {
			this.updateAppStatusOnInstance(app);
		}.bind(this));
	},

	localizeAndSetTargetUrl: function(app) {
		if (app.error)
		    return;

		var connectedStoreInstance = this.domainName.replace("apprepo.service-now", "store.servicenow");
		app.storeAppButtons.forEach(function(btn) {
		    if (btn.id == "trial-expiry-date") {
			var gdt1 = new GlideDateTime();
			var gdt2 = new GlideDateTime(app.trialExpiryDate);
			var dur = new GlideDuration();
			dur = GlideDateTime.subtract(gdt1, gdt2);
			var days = parseInt(dur.getRoundedDayPart(), 10) + " ";
			if (days > 1){
				var localizeDays = gs.getMessage("Days");
				btn.title = this.storeDetailButtons[btn.id] + days + localizeDays;
			}
			if (days == 1){
			    var localizeDay = gs.getMessage("Day");
			    btn.title = this.storeDetailButtons[btn.id] + days + localizeDay;
			}
		    } else
			btn.title = this.storeDetailButtons[btn.id];

		    if (!btn.disabled) {
			if (btn.redirect)
			    btn.targetUrl = connectedStoreInstance + btn.targetUrl + "&iid=" + this.instanceId;
			else {
				if(btn.id == "view-product") {
					var isAppPartOfSingleProduct = app.parentProducts.length == 1 && app.parentProducts[0].productList.length == 1;
					btn.targetUrl = isAppPartOfSingleProduct ? "$products.do?productId=" + app.parentProducts[0].productList[0].productId : "$products.do";
				}
				else
					btn.targetUrl = "$allappsmgmt.do?sysparm_search==" + app.scope;
			}
		    }
		}, this);
	},

	getStoreAppDetail: function(app_id, version) {
		var result = {};
		if(this.isInstanceOffline()) {
			result.error = "client_call_not_allowed";
			return result;
		}
		var appDetail = new ScopedAppRepoRequest("get_store_app_detail")
		    .setParameter("app_id", app_id)
		    .setParameter("version", version);
		var response = appDetail.get();
		if(appDetail.getStatusCode() == 200 || appDetail.getStatusCode() == 400) {
			result = new global.JSON().decode(response)[0];
			if(result.appDetails)
				this.localizeAndSetTargetUrl(result.appDetails);
			if(result.appDependency)
				this.updateDependentAppStatusOnInstance(result.appDependency);
		}else
			result.error = "no response returned";

		return result;
        },

	getStoreAppReview: function(app_id) {
		var result = {};
		if(this.isInstanceOffline()) {
			result.error = "client call not allowed";
			return result;
		}
		var appDetails = new ScopedAppRepoRequest("get_store_app_review").setParameter("app_id", app_id);
		var response = appDetails.get();
		if(appDetails.getStatusCode() == 200 || appDetail.getStatusCode() == 400)
			result = new global.JSON().decode(response);
		else
			result.error = "no response returned";
			
		return result;
        },

    isVisible : function (appDetails){
        return gs.hasRole("maint") || (appDetails.isValidField('hide_on_ui') && !appDetails.hide_on_ui) || (this.hideOnUiAppScope && (appDetails.scope == this.hideOnUiAppScope) && appDetails.block_install);
    },

	getLatestErrorMessage: function(requestType) {
		var gr = new GlideRecord("sn_appclient_store_outbound_http_quota");
		gr.get("request_type", requestType);
		return gr.getValue("last_request_error_message") || "";
	},

	isAppstorePlugin : function(source_app_id) {
		var storeAppGr = new GlideRecord("sys_store_app");
		storeAppGr.addActiveQuery();
		storeAppGr.addQuery("sys_id", source_app_id);
		storeAppGr.query();
		if (storeAppGr.next())
			return sn_app_api.AppStoreAPI.isAppstorePlugin(storeAppGr.scope.toString(), storeAppGr.sys_code.toString());
		return null;
	},

	type: 'AppsData'
};
```