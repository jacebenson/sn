---
title: "cxs_FltrConfig"
id: "cxs_fltrconfig"
---

API Name: global.cxs_FltrConfig

```js
var cxs_FltrConfig = Class.create();
cxs_FltrConfig.prototype = Object.extendsObject(cxs_Base, {
	// Update Resource Config after its related Searcher changed from Search Context
	_updateResConfigAfterSearcherChanged: function(oldSearcherSysId, newSearcherSysId, searchContextSysId, filterConfigTableName, uiConfigBaseTableName) {
		var cxs_SearchResourceConfig = new global.cxs_SearchResourceConfig();
		
		// Update filter configuration if it's search resource config belongs to the old searcher
		var grUiConfigBase = new GlideRecord("cxs_ui_config_base");
		grUiConfigBase.addQuery("cxs_context_config", searchContextSysId);
		grUiConfigBase.query();
		while (grUiConfigBase.next()) {
			// Get all filter configurations of table configuration
			var grFilterConfig = this._getFilterConfigs(filterConfigTableName, uiConfigBaseTableName, grUiConfigBase);
			while (grFilterConfig.next()) {
				var searchResConfig = grFilterConfig.getValue("cxs_search_res_config");
				// If this search resource configuration belongs to that deleted searcher, then remove this filter configuration
				var grSearchResConfig = new GlideRecord("cxs_search_res_config");
				if (grSearchResConfig.get(searchResConfig))
					if (grSearchResConfig.getValue("cxs_searcher_config") === oldSearcherSysId) {
						// Case 1: removes searcher from context
						if (gs.nil(newSearcherSysId))
							this._removeCertainFltrConfigAsSearcherChanged(grFilterConfig);
						// Case 2: changes searcher from one to another one
						else {
							// Update resource configuration to the right one fron new searcher
							var searchResourceSysId = grSearchResConfig.getValue("search_resource_id");
							var grRightSearchResConfig = cxs_SearchResourceConfig.getSearchResConfigs(newSearcherSysId, searchResourceSysId);
							if (grRightSearchResConfig.next())
								this._updateResConfig(grFilterConfig, grRightSearchResConfig.getUniqueValue());
							else
								this._removeCertainFltrConfigAsSearcherChanged(grFilterConfig);
						}
					}
				else
					this._removeCertainFltrConfigAsSearcherChanged(grFilterConfig);
			}
		}
	},
	
	// Get all active filter configurations with certain conditions
	// filterConfigTableName: class name of filter configuration
	// uiConfigBaseTableName: class name of UI Config Base
	// grUiConfigBase: glide record of UI Config Base
	_getFilterConfigs: function(filterConfigTableName, uiConfigBaseTableName, grUiConfigBase) {
		var grFilterConfig = new GlideRecord(filterConfigTableName);
		grFilterConfig.addActiveQuery();
		grFilterConfig.addQuery(uiConfigBaseTableName, grUiConfigBase.getUniqueValue());
		grFilterConfig.query();
		return grFilterConfig;
	},
	
	// Update Resource Configuration of Filter Configuration
	// grFilterConfig: glide record of Filter Configiuration
	// searchResConfigSysId: the system ID of Search Resource Configuration
	_updateResConfig: function(grFilterConfig, searchResConfigSysId) {
		grFilterConfig.setValue("cxs_search_res_config", searchResConfigSysId);
		grFilterConfig.update();
		gs.log("Updated Resource Configuration for Filter Configuration [" + grFilterConfig.getUniqueValue() + "].");
	},
	
	// Remove certain Filter Configuration if its related Searcher has been changed from Search Context
	// grFilterConfig: glide record of Filter Configuration
	_removeCertainFltrConfigAsSearcherChanged: function(grFilterConfig) {
		grFilterConfig.deleteRecord();
		gs.log("Removed a Filter Configuration because its related Searcher has been changed from Search Context.");
	},
	
	// Core code for looking up the search resource filter.
	_getSearchResourceFilter: function(baseRef) {
		var resourceIds = [];

		// DEF0075731: Collect all resource configurations that we have already used so far to avoid duplicate
		var exsitingResConfigs = [];
		var grFilterConfig = new GlideRecord("cxs_table_fltr_config");
		grFilterConfig.addQuery("cxs_table_config", baseRef.sys_id + "");
		grFilterConfig.query();
		while (grFilterConfig.next())
			exsitingResConfigs.push(grFilterConfig.getValue("cxs_search_res_config"));
	
		// Search tranditional search res configs from searcher
		var searcherId = baseRef.cxs_context_config.cxs_searcher_config;
		if (!JSUtil.nil(searcherId)){
			var resources = new GlideRecord("cxs_search_res_config");
			resources.addActiveQuery();
			resources.addQuery("cxs_searcher_config", searcherId);
			resources.query();

			var srchResConf = cxs_App.getBusiness(resources);
			while (resources.next()) {
				if (!srchResConf.supportsEncodedQuery())
					continue;
				if (exsitingResConfigs.indexOf(resources.getUniqueValue()) === -1)
					resourceIds.push(resources.getUniqueValue()+"");
			}
		}

		// Search additional search res configs
		if (baseRef.sys_class_name + '' === 'cxs_table_config') {
			var contextId = baseRef.cxs_context_config + '';
			var contextRes = new GlideRecord('cxs_res_context_config');
			contextRes.addActiveQuery();
			contextRes.addQuery('cxs_context_config', contextId);
			contextRes.addQuery('cxs_search_res_config.resource_type', '=', 'table');// DEF0074179: dynamic filter should only support "Table" type of search resources
			contextRes.query();
			while(contextRes.next()) {
				if (exsitingResConfigs.indexOf(contextRes.cxs_search_res_config + '') === -1)
					resourceIds.push(contextRes.cxs_search_res_config + '');
			}
		}

		return "sys_idIN" + resourceIds;
	},
	
	_removeFilterConfigsFromTableConfig: function(tableConfig) {
		var fc = new GlideRecord("cxs_table_fltr_config");
		fc.addQuery("cxs_table_config", tableConfig);
		fc.query();
		if(fc.next())
			fc.deleteMultiple();
	},
	
	_removeFilterConfigsFromRecordProducer: function(recordProducerConfig) {
		var fc = new GlideRecord("cxs_rp_fltr_config");
		fc.addQuery("cxs_rp_config", recordProducerConfig);
		fc.query();
		if(fc.next())
			fc.deleteMultiple();
	},
	
    type: 'cxs_FltrConfig'
});
```