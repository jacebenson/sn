---
title: "PluginDependency"
id: "plugindependency"
---

API Name: sn_dependentclient.PluginDependency

```js
            var PluginDependency = Class.create();
            PluginDependency.prototype = {
                initialize: function () {
					this._appstoreIntegration = new AppstoreIntegration();
                    this._json = new global.JSON();
                },

                /* Returns all the appstore applications dependent on the plugins given
                 * Input: a list of all the plugins for which dependent apps are required
                 * Eg. : PluginList - ["com.service.a","com.glide.b"]
                 *
                 * Output: a dictionary containing list of dependent apps based on each plugin
                 * Sample Output: DependentApps - { "com.service.a" :{[title: app1, version: 1.0.0, .....], [title: app2, version: 1.5.0, .....] },
                 *                                  "com.glide.b"   :{[title: app2, version: 1.0.0, .....], [title: app3, version: 1.2.0, .....] }
                 *                                }
                 */
                getDependentApps: function (pluginList) {
					 if(gs.nil(pluginList) || pluginList.length == 0) {
                        return {
                          "error" : "Parameter pluginList is missing/empty"
                        };
                    }
					
                    var dependentApps = {};
					var gr = new GlideRecord("sn_dependentclient_app_plugin_map");
                    var grOR = gr.addQuery("plugin_id", pluginList[0]);
                    for (var i = 1; i < pluginList.length; i++) {
                        grOR.addOrCondition("plugin_id", pluginList[i]);
                    }
                    gr.query();
                    while(gr.next()) {
                        var application = {};
                        application.source_app_id = gr.application.source_app_id.toString();
                        application.version = gr.application.version.toString();
                        application.title = gr.application.title.toString();
                        application.scope = gr.application.scope.toString();
                        application.compatibility = gr.application.compatibility.toString();
                        application.vendor_name = gr.application.vendor_name.toString();
                        application.tagline = gr.application.tagline.toString();
                        application.description = gr.application.description.toString();
                        application.price_type = gr.application.price_type.toString();
                        application.app_type = gr.application.app_type.toString();
                        application.trial_available = gr.application.trial_available.toString();
                        application.logo = gr.application.logo.toString();
                        application.featured_icon = gr.application.featured_icon.toString();
                        application.appstore_link = gr.application.appstore_link.toString();
                        application.demo_available = gr.application.demo_available.toString();
                        application.categories = gr.application.categories.toString().split("|");
						application.is_installed = this._appstoreIntegration.is_installed(application.source_app_id, application.scope, application.version);
                        application.can_install_update = this._appstoreIntegration.can_install_update(gr.application.has_entitlement.toString(), application.source_app_id, application.scope, application.version);
						application.artifacts = gs.nil(gr.application.artifacts) ? [] : this._json.decode(gr.application.artifacts);
                        application.description_html = gr.application.description_html.toString();
                        if(gs.nil(dependentApps[gr.plugin_id.toString()])) {
                            dependentApps[gr.plugin_id.toString()] = [];
                        }
                        dependentApps[gr.plugin_id.toString()].push(application);
                    }
                   
                    return dependentApps;
                },

                //call this to get a fresh data of app plugin dependency from Appstore
                refreshDependentApps: function() {
					this._appstoreIntegration.getPluginDependency();
                },

                type: 'PluginDependency'
            };
            
```