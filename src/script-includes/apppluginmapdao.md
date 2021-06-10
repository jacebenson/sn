---
title: "AppPluginMapDao"
id: "apppluginmapdao"
---

API Name: sn_dependentclient.AppPluginMapDao

```js
            var AppPluginMapDao = Class.create();
            AppPluginMapDao.prototype = {
                initialize: function () {
                },

                upsertAppPluginMap: function (pluginId, sourceAppId) {
                    var gr = new GlideRecord("sn_dependentclient_app_plugin_map");
                    gr.addQuery("plugin_id", pluginId);
                    gr.addQuery("application.source_app_id", sourceAppId);
                    gr.query();
                    if (!gr.next()) {
                        var app = new PluginDependentApplicationDao().getApplication(sourceAppId);
                        if (app && app.sysId) {
                            gr.initialize();
                            gr.application = app.sysId;
                            gr.plugin_id = pluginId;
                            gr.current = true;
                            gr.insert();
                        }
                    } else {
                        gr.current = true;
                        gr.update();
                    }
                },

                markCurrentFalse: function (pluginList) {
                    var gr = new GlideRecord("sn_dependentclient_app_plugin_map");
                    /*var grOR = gr.addQuery("plugin_id", pluginList[0]);
                     for(var i =1; i< pluginList.length; i++) {
                     grOR.addOrCondition("plugin_id", pluginList[i]);
                     }*/
                    gr.query();
                    gr.setValue('current', false);
                    gr.updateMultiple();
                },

                //delete app-plugin mapping which doesn't exist anymore
                deleteInvalidEntries: function () {
					gs.debug("Deleting Invalid Mappings");
                    var gr = new GlideRecord("sn_dependentclient_app_plugin_map");
                    gr.addQuery("current", false);
                    gr.deleteMultiple();
                },

                /*input: {
                    "pluginId1": ["sourceAppId1", "sourceAppId1"],
                    "pluginId2": ["sourceAppId3", "sourceAppId1"],
                 }*/
                upsertMultiplePluginAppMapping: function (pluginAppMap) {
                    for (var plugin in pluginAppMap) {
                        var sourceAppIdList = pluginAppMap[plugin];
                        for (var i = 0; i < sourceAppIdList.length; i++) {
                            this.upsertAppPluginMap(plugin, sourceAppIdList[i]);
                        }
                    }
                },

                type: 'AppPluginMapDao'
            };
            
```