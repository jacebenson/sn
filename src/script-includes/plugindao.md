---
title: "PluginDao"
id: "plugindao"
---

API Name: sn_dependentclient.PluginDao

```js

        var PluginDao = Class.create();
        PluginDao.prototype = {
            initialize: function () {
            },

            getActiveWhitelistPlugins: function () {
                var pluginList = [];
                var pluginGr = new GlideRecord("sn_dependentclient_plugin");
                pluginGr.query();
                while (pluginGr.next()) {
                	if (GlidePluginManager.isActive(pluginGr.plugin_id + ""))
                		pluginList.push(pluginGr.plugin_id + "");
                }

                return pluginList;
            },

            upsertPlugin: function (pluginId) {
                var pluginGr = new GlideRecord("sn_dependentclient_plugin");
                pluginGr.addQuery("plugin_id", pluginId);
                pluginGr.query();
                if (!pluginGr.next()) {
                    pluginGr.initialize();
                    pluginGr.plugin_id = pluginId;
                    return pluginGr.insert();
                }
            },

            //delete all and insert new ones
            updateWhitelist: function (pluginIdList) {
                var pluginGr = new GlideRecord("sn_dependentclient_plugin");
                pluginGr.deleteMultiple();

                for (var index in pluginIdList) {
                    if (pluginIdList.hasOwnProperty(index)) {
                        this.upsertPlugin(pluginIdList[index]);
                    }
                }
                return true;
            },


            type: 'PluginDao'
        };
        
```