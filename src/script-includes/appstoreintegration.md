---
title: "AppstoreIntegration"
id: "appstoreintegration"
---

API Name: sn_dependentclient.AppstoreIntegration

```js
            var AppstoreIntegration = Class.create();
            AppstoreIntegration.prototype = {
                initialize: function () {
                },

                callPluginDependenciesWebservice: function () {
                    var request;
                    var response = {};
                    var json = new global.JSON();
                    var content = {};

                    try {
                        content.instance_id = gs.getProperty('instance_id');
                        content.plugins = new PluginDao().getActiveWhitelistPlugins();
                        var endPoint = this.getStoreApiUrl();
                        request = new sn_ws.RESTMessageV2();
                        request.setEndpoint(endPoint);
                        request.setHttpMethod('POST');
                        request.setRequestHeader("Content-Type", "application/json");
                        request.setRequestHeader("Accept", "application/json");
                        request.setRequestHeader("Authorization", this.addAuthorization());
                        request.setRequestHeader("Authversion", "v2");
                        request.setRequestBody(json.encode(content));

                        response = request.execute();
                        var result = {};
                        result.status = response.getStatusCode();
                        result.body = new global.JSON().decode(response.getBody());
                        result.error = response.haveError();
                        result.errorCode = response.getErrorCode();
                        result.errorMessage = response.getErrorMessage();

                        if (result.error) {
                            gs.error("Error code: " + result.errorCode);
                            gs.error("Error message: " + result.errorMessage);
                        }
                        return result.body;
                    } catch (error) {
                        gs.error("Unable to parse response from AppStore. The server may not be active");
                        gs.error("Error : " + error);
                        response.result = {};
                        response.result.errors = error;
                    }

                    return response;
                },

                getStoreApiUrl: function() {
                	return this.getBaseUrl() + gs.getProperty("sn_appclient.repository_processor", "sn_orchestration_api_v1.do") + "?type=get_dependent_apps";
                },

                getBaseUrl: function () {
                    var devUrl = gs.getProperty("sn_appclient.dev_repository_base_url", "http://localhost:8080/");
                    var prodUrl = gs.getProperty("sn_appclient.repository_base_url", "https://apprepo.service-now.com/");
                    var isDev = gs.getProperty("glide.installation.developer", "false") == "true";
                    var resultURL = isDev ? devUrl : prodUrl;

                    if (!resultURL.endsWith("/")) {
                        resultURL += "/";
                    }

                    return resultURL;
                },

                addAuthorization: function () {
                    var authScriptInclude = "sn_apprepo.AppRepo";
                    var instance_id = gs.getProperty("instance_id");
                    var authValue = authScriptInclude + " " + gs.base64Encode(instance_id);
                    var credential = gs.getProperty("sn_apprepo.credential");

                    if (!gs.nil(credential)) {
                        authValue += ":" + gs.base64Encode(credential);
                    }

                    return authValue;
                },

                getPluginDependency: function () {
                    var response = this.callPluginDependenciesWebservice();
                    gs.debug("Response of the appstore call: " + new global.JSON().encode(response));

                    if (response && !gs.nil(response.errors)) {
                        gs.error("Call not processed completely, error thrown by appstore: " + new global.JSON().encode(response));
                        return;
                    }

                    var responseData = response.messages;
                    var appPluginMapDao = new AppPluginMapDao();
                    var pluginDependentApplicationDao = new PluginDependentApplicationDao();

                    if (responseData && !gs.nil(responseData.applications)) {
                        gs.debug("Updating Applications Data");
                        pluginDependentApplicationDao.markCurrentFalse();
                        pluginDependentApplicationDao.upsertMultipleApplication(responseData.applications);
                        pluginDependentApplicationDao.deleteInvalidEntries();
                    }
                    if (responseData && responseData.plugin_app_list) {
                        gs.debug("Updating Plugin App Mapping Data");
                        appPluginMapDao.markCurrentFalse();
                        appPluginMapDao.upsertMultiplePluginAppMapping(responseData.plugin_app_list);
                        appPluginMapDao.deleteInvalidEntries();
                    }
                    if (responseData && !gs.nil(responseData.whitelist_plugins)) {
                        gs.debug("Updating Plugins Data");
                        new PluginDao().updateWhitelist(responseData.whitelist_plugins);
                    }

                },

				is_installed:function(source_app_id, scope, version){
					var gr = new GlideRecord("sys_store_app");
					gr.addQuery("sys_id",source_app_id);
					gr.addQuery("scope",scope);
					gr.addQuery("version",version);
					gr.query();
					return gr.next();
				},

                can_install_update:function(has_entitlement, source_app_id, scope, latest_version){
                	if(has_entitlement == "true"){
                        var grStoreApp = new GlideRecord("sys_store_app");
                        grStoreApp.addQuery("sys_id",source_app_id);
                        grStoreApp.addQuery("scope",scope);
                        grStoreApp.query();
                        while(grStoreApp.next()){
                        	return (grStoreApp.version.toString() != latest_version).toString();
                        }
                    }

                    return (has_entitlement == "true").toString();
                },

                type: 'AppstoreIntegration'
            };
            
```