---
title: "ManifestService"
id: "manifestservice"
---

API Name: sn_appclient.ManifestService

```js
var ManifestService = Class.create();
ManifestService.prototype = {
    initialize: function() {
    },

	getAllMissingManifests: function() {
		gs.info("Requesting app manifests for all sys_app_versions for which no manifest is present.");
		
		//loop through the sys_app_version table, ask the store for any missing manifests
		var appVersions = new GlideRecord("sys_app_version");
		appVersions.addNullQuery("manifest");
		appVersions.query();
		
		while (appVersions.next()) {
			var version = appVersions.getValue("version");
			var app_id = appVersions.getValue("source_app_id");
			
			this.getManifestForAppVersion(app_id, version);
		}
	},

    getManifestForAppVersionSysId: function(/* string, string */ source_app_id, version){
        gs.info("Getting manifest for source_app_id {0}", source_app_id);
        var manifest;
        var versionRecord = new GlideRecord("sys_app_version");
        versionRecord.addQuery("source_app_id", source_app_id);
        versionRecord.addQuery("version", version);
        versionRecord.query();
        if(versionRecord.next()) {
            manifest = versionRecord.getValue("manifest");
            try {
                  manifest = new global.JSON().decode(manifest);
            } catch (e) {
                gs.error("Unable to convert manifest {0} to JSON object. Perhaps it's not valid? Error is {1}", manifest, e);
            }
        }
        return manifest;
    },
	
	getManifestForAppVersion: function(/* string */ app_id,/* string */ version) {
		gs.info("Getting manifest for app {0}, version {1}", app_id, version);
		var manifest;
		
		var versionRecord = new GlideRecord("sys_app_version");
		versionRecord.addQuery("source_app_id", app_id);
		versionRecord.addQuery("version", version);		
		versionRecord.query();
		
		if(versionRecord.next()) {
			manifest = versionRecord.getValue("manifest");
		
			if(!manifest)
				manifest = this._getManifestFromRepo(app_id, version);
		
			if(manifest) {
				versionRecord.setValue("manifest", manifest);
				versionRecord.update();
			
				try {
					manifest = new global.JSON().decode(manifest);
				} catch (e) {
					gs.error("Unable to convert manifest {0} to JSON object. Perhaps it's not valid? Error is {1}", manifest, e);
				}
			}
		}

		return manifest;
	},
	
	_getManifestFromRepo: function(/* string */ app_id, /* string */ version) {
		gs.info("Requesting app {0} manifest for version {1} from repo.", app_id, version);
		
		var request = new ScopedAppRepoRequest("get_app_preview");
		request.setParameter("source_app_id", app_id);
		request.setParameter("version", version);
		
		var manifest = request.get();
		var errorMsg = request.getErrorMessage();

		if (errorMsg) {
			gs.error("Unable to download manifest for source app {0} version {1}. Error is {2}", app_id, version, errorMsg);
			return;
		}
		
		return manifest;
			
	},
	
    type: 'ManifestService'
};
```