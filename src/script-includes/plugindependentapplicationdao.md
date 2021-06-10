---
title: "PluginDependentApplicationDao"
id: "plugindependentapplicationdao"
---

API Name: sn_dependentclient.PluginDependentApplicationDao

```js

        var PluginDependentApplicationDao = Class.create();

        PluginDependentApplicationDao.prototype = {
            initialize: function () {
                this._json = new global.JSON();
            },

            getApplication: function (sourceAppId) {
                var gr = new GlideRecord("sn_dependentclient_application");
                gr.addQuery("source_app_id", sourceAppId);
                gr.query();
                var application = {};
                if (gr.next()) {
                    application.sysId = gr.sys_id.toString();
                    return application;
                }
                return {
                    "error": "No such application exist"
                };
            },

            upsertApplication: function (application) {
                var appSysId;
                var isNew = false;
                var gr = new GlideRecord("sn_dependentclient_application");
                gr.addQuery("source_app_id", application.source_app_id);
                gr.query();
                if (!gr.next()) {
                    gr.initialize();
                    isNew = true;
                }
                gr.source_app_id = application.source_app_id;
                gr.version = application.version;
                gr.scope = application.scope;
                gr.title = application.title;
                gr.compatibility = application.compatibility;
                gr.vendor_name = application.vendor_name;
                gr.tagline = application.tagline;
                gr.description = application.description;
                gr.trial_available = application.trial_available;
                gr.demo_available = application.demo_available;
                gr.logo = application.logo;
                gr.appstore_link = application.appstore_link;
                gr.featured_icon = application.featured_icon;
                gr.price_type = application.price_type.toLowerCase();
                gr.app_type = application.app_type.toLowerCase();
                gr.has_entitlement = application.has_entitlement || false;
                gr.artifacts = this._json.encode(application.artifacts);
                gr.description_html = application.description_html;
                if(application.categories && application.categories.length > 0) {
                    var categories = application.categories[0];
                    for(var i=1;i< application.categories.length; i++) {
                        categories += "|"+application.categories[i];
                    }
                    gr.categories = categories;
                }
                gr.current = true;
                if (isNew) {
                    appSysId = gr.insert();
                } else {
                    appSysId = gr.sys_id.toString();
                    gr.update();
                }
                return appSysId;
            },

            markCurrentFalse: function () {
                var gr = new GlideRecord("sn_dependentclient_application");
                gr.query();
                gr.setValue('current', false);
                gr.updateMultiple();
            },

            //delete withdrawn apps
            deleteInvalidEntries: function () {
                gs.debug("Deleting invalid Apps");
                var gr = new GlideRecord("sn_dependentclient_application");
                gr.addQuery("current", false);
                gr.deleteMultiple();
            },

            upsertMultipleApplication: function (appList) {
                for (var index in appList) {
                    if (appList.hasOwnProperty(index)) {
                        this.upsertApplication(appList[index]);
                    }
                }
            },

            type: 'PluginDependentApplicationDao'
        };
        
```