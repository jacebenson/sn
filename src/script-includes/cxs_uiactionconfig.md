---
title: "cxs_UIActionConfig"
id: "cxs_uiactionconfig"
---

API Name: global.cxs_UIActionConfig

```js
var cxs_UIActionConfig = Class.create();
cxs_UIActionConfig.prototype = {
	/*
		SC: cxs_context_config
		TC: cxs_table_config
		RC: cxs_res_context_config
		UA: cxs_ui_action
		UAC: cxs_ui_action_config
	*/

	MATCH_ALL: '*',
	SEARCH_RESOURCE_PREFIX: 'com.snc.contextual_search.search_resource.',

	SEARCH_RESOURCE_TABLE_MAP: {
		'KnowledgeSearchResource': 'kb_knowledge',
		'PinnedArticleSearchResource': 'kb_knowledge',
		'ServiceCatalogSearchResource': 'sc_cat_item',
		'SocialQASearchResource': 'kb_social_qa_question'
	},

	ADDITIONAL_SEARCH_RESOURCE_EXCEPTIONS: {
		'rp': '*',
		'platform': '3db2c31c73202300d144234ffff6a7ca'
	},

	SHOW_ON_NEW_CONFIG: {
		"platform": ["order", "this_helped", "full_view"],
		"workspace": ["order", "flag", "full_view"],
		"rp": []
	},

	UI_ACTION_RESOURCE_TABLE_EXCEPTIONS: {
		"full_view": "sc_cat_item"
	},

	initialize: function(isUsedInFixScript) {
		this.isUsedInFixScript = isUsedInFixScript ? true : false;
		this.hasUpgradedToLondon = GlideTableDescriptor.fieldExists("cxs_search_resource", "ui_actions");
	},

	isAddSearchResource: function(searchResourceConfig) {
		return !gs.nil(searchResourceConfig.getValue('resource_type'));
	},

	isValidUITypes: function(tableConfigGR, uiActionGR) {
		var tableConfigUIType = this.getUITypeForTCorRP(tableConfigGR);
		var actionUITypes = uiActionGR.getValue("ui_types");
		if (tableConfigUIType == "rp" && actionUITypes.indexOf("Service Portal") != -1)
			return true;

		if (tableConfigUIType == "platform" && actionUITypes.indexOf("Desktop") != -1)
			return true;

		if (tableConfigUIType == "workspace" && actionUITypes.indexOf("Service Workspace") != -1)
			return true;

		return false;
	},

	isValidAddSearchResourceForTableConfig: function(tableConfigGR, searchResourceConfigGR) {
		var tableConfigUIType = this.getUITypeForTCorRP(tableConfigGR);
		var exceptionValue = this.ADDITIONAL_SEARCH_RESOURCE_EXCEPTIONS[tableConfigUIType];
		if (exceptionValue == this.MATCH_ALL || exceptionValue.indexOf(searchResourceConfigGR.getUniqueValue()) > 0)
			return false;

		return true;
	},

	isValidUIActionForResourceTable: function (uiActionGR, resourceTable) {
		// For "Full view" ui action, we don't create search action config for catalog table
		if (this.UI_ACTION_RESOURCE_TABLE_EXCEPTIONS[uiActionGR.getValue('action_id')] == resourceTable)
			return false;
		
		return true;
	},

	isShowOnNewTrue: function (uiConfigBase, uiAction) {
		if (this.SHOW_ON_NEW_CONFIG[this.getUITypeForTCorRP(uiConfigBase)].indexOf(uiAction.getValue("action_id")) !== -1)
			return true;

		return false;
	},

	getUITypeForTCorRP: function(baseUIConfigGR) {
		if (baseUIConfigGR.getValue('sys_class_name') == 'cxs_rp_config')
			return 'rp';

		var tableConfigGR = new GlideRecord('cxs_table_config');
		if (!tableConfigGR.get(baseUIConfigGR.getUniqueValue()))
			return null;

		return tableConfigGR.getValue('ui_type');
	},

	getTableForTCorRP: function(baseUIConfigGR) {
		if (baseUIConfigGR.getValue('sys_class_name') == 'cxs_rp_config')
			return null;

		var tableConfigGR = new GlideRecord('cxs_table_config');
		if (!tableConfigGR.get(baseUIConfigGR.getUniqueValue()))
			return null;

		return tableConfigGR.getValue('table');
	},

	buildUACFromSearchContext: function(searchContextGR) {
		var tableConfigGR = new GlideRecord('cxs_ui_config_base');
		tableConfigGR.addQuery('cxs_context_config', searchContextGR.getUniqueValue());
		tableConfigGR.query();
		while (tableConfigGR.next())
			this.buildUACFromTableConfig(tableConfigGR);
	},

	buildUACFromTableConfig: function(tableConfigGR) {
		var newUIActionConfigs = [];
		var cxsSearchResourceConfig = new GlideRecord('cxs_search_res_config');
		cxsSearchResourceConfig.addQuery('cxs_searcher_config', tableConfigGR.cxs_context_config.cxs_searcher_config);
		cxsSearchResourceConfig.query();
		while (cxsSearchResourceConfig.next()) {
			var searchResourceSysId = cxsSearchResourceConfig.getValue('search_resource_id');
			var searchResourceGR = new GlideRecord('cxs_search_resource');
			searchResourceGR.addQuery('id', searchResourceSysId);
			searchResourceGR.query();
			if (!searchResourceGR.next())
				continue;

			var resourceTable = this.SEARCH_RESOURCE_TABLE_MAP[searchResourceSysId.substring(this.SEARCH_RESOURCE_PREFIX.length)];
			this.buildUACFromUA(tableConfigGR, searchResourceSysId, null, resourceTable, newUIActionConfigs);
		}
		this.deleteUACFromTableConfig(tableConfigGR.getUniqueValue(), newUIActionConfigs);
	},
	
	buildUACFromTrendRec: function(trendRec) {
		if (!trendRec || !trendRec.isValidRecord())
			return;
		
		var tableConfigGR = trendRec.agent_assist_recommendation.table_config.getRefRecord();
		if (!tableConfigGR || !tableConfigGR.isValidRecord())
			return;
		
		var actions = [];
		if (trendRec.primary_action)
			actions.push(trendRec.primary_action + '');
		if (trendRec.additional_actions)
			actions = actions.concat(trendRec.additional_actions.toString().split(','));
		if (actions.length == 0)
			return;
		
		var trendRecId = trendRec.getUniqueValue();
		var newUIActionConfigs = [];
		var order = this.getStartingOrder(tableConfigGR.getUniqueValue(), '', '', trendRecId);
		for (var i = 0; i < actions.length; i++) {
			var uiActionGR = new GlideRecord('cxs_ui_action');
			uiActionGR.get(actions[i]);
			if (!uiActionGR.isValidRecord())
				continue;

			var newUIActionConfigGR = new GlideRecord("cxs_ui_action_config");
			newUIActionConfigGR.initialize();
			this.setUACRecordFromUARecord(newUIActionConfigGR, uiActionGR, tableConfigGR, '', '', order, trendRecId);
			newUIActionConfigGR.insert();
			newUIActionConfigs.push(newUIActionConfigGR.getUniqueValue());
			order += 100;
		}
		this.deleteUACFromTrendRec(trendRec.getUniqueValue(), newUIActionConfigs);
	},

	updateAddUACFromResourceContext: function(resourceContextGR, isInsert) {
		var tableConfigGR = new GlideRecord("cxs_ui_config_base");
		tableConfigGR.addQuery("cxs_context_config", resourceContextGR.getValue('cxs_context_config'));
		tableConfigGR.query();
		while (tableConfigGR.next())
			this.updateAddUACFromTableConfigAndResourceContext(tableConfigGR, resourceContextGR, [], isInsert);
	},

	buildAddUACFromTableConfig: function(tableConfigGR) {
		var newUIActionConfigs = [];
		var resourceContextGR = new GlideRecord("cxs_res_context_config");
		resourceContextGR.addQuery("cxs_context_config", tableConfigGR.getValue("cxs_context_config"));
		resourceContextGR.query();
		while (resourceContextGR.next())
			this.updateAddUACFromTableConfigAndResourceContext(tableConfigGR, resourceContextGR, newUIActionConfigs, true);
		this.deleteAddUACFromTableConfig(tableConfigGR.getUniqueValue(), newUIActionConfigs);
	},

	updateAddUACFromTableConfigAndResourceContext: function(tableConfigGR, resourceContextGR, newUIActionConfigs, isInsert) {		
		var searchResourceConfigSysId = resourceContextGR.getValue("cxs_search_res_config");		
		var searchResourceConfigGR = new GlideRecord("cxs_search_res_config");
		if (!searchResourceConfigGR.get(searchResourceConfigSysId))
			return;
		
		if (!this.isAddSearchResource(searchResourceConfigGR))
			return;
		
		if (!this.isValidAddSearchResourceForTableConfig(tableConfigGR, searchResourceConfigGR))
			return;
		
		if (isInsert) {
			this.buildUACFromUA(tableConfigGR, searchResourceConfigGR.getValue('search_resource_id'), searchResourceConfigSysId, searchResourceConfigGR.getValue('table'), newUIActionConfigs);
		} else {
			var uiActionConfigGR = new GlideRecord("cxs_ui_action_config");
			uiActionConfigGR.addQuery('search_ui_config',  tableConfigGR.getUniqueValue());
			uiActionConfigGR.addQuery('search_res_config', searchResourceConfigGR.getUniqueValue());
			uiActionConfigGR.query();
			uiActionConfigGR.deleteMultiple();
		}
	},
	
	buildUACFromUA: function(tableConfigGR, searchResourceId, searchResourceConfigSysId, resourceTable, newUIActionConfigs) {
		var uiActionGR = this.getUIActionGR(this.getTableForTCorRP(tableConfigGR), resourceTable);
		var order = this.getStartingOrder(tableConfigGR.getUniqueValue(), searchResourceId, searchResourceConfigSysId, '');
		while (uiActionGR.next()) {
			if (!this.isValidUITypes(tableConfigGR, uiActionGR))
				continue;
			
			if (!this.isValidUIActionForResourceTable(uiActionGR, resourceTable))
				continue;
			
			var uiActionConfigGR = this.getUIActionConfigGR(tableConfigGR.getUniqueValue(), uiActionGR.getUniqueValue(), searchResourceId, searchResourceConfigSysId, '');
			if (uiActionConfigGR.next()) {
				newUIActionConfigs.push(uiActionConfigGR.getUniqueValue());
				if (this.isUsedInFixScript) {
					if (!this.hasUpgradedToLondon)
						this.setLondonFields(uiActionGR, uiActionConfigGR, tableConfigGR);
					this.setMadridFields(uiActionGR, uiActionConfigGR);
					uiActionConfigGR.update();
				}
			} else {
				var newUIActionConfigGR = new GlideRecord("cxs_ui_action_config");
				newUIActionConfigGR.initialize();
				this.setUACRecordFromUARecord(newUIActionConfigGR, uiActionGR, tableConfigGR, searchResourceId, searchResourceConfigSysId, order, '');
				if (this.isUsedInFixScript && !this.hasUpgradedToLondon)
					this.setLondonFields(uiActionGR, newUIActionConfigGR, tableConfigGR);
				newUIActionConfigGR.insert();
				newUIActionConfigs.push(newUIActionConfigGR.getUniqueValue());
				order += 100;
			}
		}
	},

	setUACRecordFromUARecord: function(configGR, actionGR, tableConfigGR, searchResourceId, searchResourceConfigSysId, order, trendRecId) {
		var actionId = actionGR.getValue('action_id');
		if (!gs.nil(searchResourceId))
			configGR.setValue('search_resource', searchResourceId);
		if (!gs.nil(trendRecId))
			configGR.setValue('trend_recommendation', trendRecId);
		if (!gs.nil(searchResourceConfigSysId))
			configGR.setValue('search_res_config', searchResourceConfigSysId);
		configGR.setValue('search_ui_action', actionGR.getUniqueValue());
		configGR.setValue('search_ui_config', tableConfigGR.getUniqueValue());
		configGR.setValue('active', true);
		configGR.setValue('action_label', actionGR.getValue('name'));
		configGR.setValue('action_value', actionGR.getValue('name'));
		configGR.setValue('order', order);
		configGR.setValue('show_on_new', this.isShowOnNewTrue(tableConfigGR, actionGR));
		if (!gs.nil(actionGR.getValue('ui_action_visibility_script'))) {
			configGR.setValue('ui_action_visibility_script', actionGR.getValue('ui_action_visibility_script'));
			configGR.setValue('advanced_visibility', true);
		}

		if (actionId == 'attach') {
			configGR.setValue('action_value', 'attach');
			configGR.setValue('attachment_type', 'embed_link');
			configGR.setValue('badge_label', 'Attached');
		} else if (actionId == 'order')
			configGR.setValue('action_value', 'order');
		else if (actionId == 'this_helped')
			configGR.setValue('badge_label', 'Helpful');
		if (this.getUITypeForTCorRP(tableConfigGR) == 'workspace') {
			if (actionId == 'this_helped') {
				configGR.setValue('action_label', 'Helpful');
				configGR.setValue('action_undo_label', 'Not Helpful');
			} else if (actionId == 'attach') {
				configGR.setValue('action_undo_label', 'Unattach');
			}
		}
		this.setMadridFields(actionGR, configGR);
	},

	setMadridFields: function(actionGR, configGR) {
		configGR.setValue('table', actionGR.getValue('table'));
		configGR.setValue('current_table', actionGR.getValue('current_table'));
		if (!this.isUsedInFixScript) {
			configGR.setValue('rest_api', actionGR.getValue('rest_api'));
			configGR.setValue('action_condition', actionGR.getValue('default_condition'));
			configGR.setValue('current_action_condition', actionGR.getValue('current_action_condition'));
		} else {
			if (gs.nil(configGR.getValue('action_condition')))
				configGR.setValue('action_condition', actionGR.getValue('default_condition'));
			if (gs.nil(configGR.getValue('current_action_condition')))
				configGR.setValue('current_action_condition', actionGR.getValue('current_action_condition'));
		}
	},

	setLondonFields: function(actionGR, configGR, tableConfigGR) {
		var actionId = actionGR.getValue('action_id');
		if (actionId == 'this_helped') {
			var resultActionLabel = tableConfigGR.getValue('result_action_label');
			var resultActionValue = tableConfigGR.getValue('result_action_value');
			if (!gs.nil(resultActionLabel))
				configGR.setValue('action_label', resultActionLabel);
			if (!gs.nil(resultActionValue))
				configGR.setValue('action_value', resultActionValue);
		} else if (actionId == 'attach') {
			var kbAttachment = tableConfigGR.getValue('kb_attachment');
			if (!gs.nil(kbAttachment))
				configGR.setValue('attachment_type', kbAttachment);
		}
	},

	getStartingOrder: function(tableConfigSysId, searchResourceId, searchResourceConfigSysId, trendRecId) {
		//find the max of order for this config and this search resource
		var count = new GlideAggregate('cxs_ui_action_config');
		count.addQuery('search_ui_config', tableConfigSysId);
		if (!gs.nil(trendRecId))
			count.addQuery('trend_recommendation', trendRecId);
		else {
			if (!gs.nil(searchResourceConfigSysId))
				count.addQuery('search_resource',  searchResourceId);
			else
				count.addQuery('search_res_config',  searchResourceConfigSysId);
		}
		count.addAggregate('MAX', 'order');
		count.orderByAggregate('MAX', 'order');
		count.query();
		if (!count.next())
			return 100;
		
		return Number(count.getAggregate('MAX', 'order')) + 100;
	},

	getUIActionGR: function(currentTable, resourceTable, isRecommendation) {
		isRecommendation = !!isRecommendation;
		var grUiAction = new GlideRecord("cxs_ui_action");
		grUiAction.addActiveQuery();
		if (currentTable)
			grUiAction.addEncodedQuery("current_tableISEMPTY^ORcurrent_table=" + currentTable + "^tableISEMPTY^ORtable=" + resourceTable);
		else
			grUiAction.addEncodedQuery("current_tableISEMPTY^tableISEMPTY^ORtable=" + resourceTable);
		if (isRecommendation)
			grUiAction.addQuery('recommendation_action', true);
		else
			grUiAction.addEncodedQuery('recommendation_action=false^ORrecommendation_actionISEMPTY');
		grUiAction.orderBy("name");
		grUiAction.query();
		return grUiAction;
	},

	getUIActionConfigGR: function(tableConfigSysId, uiActionSysId, searchResourceId, searchResourceConfigSysId, trendRecId) {
		var uiActionConfigGR = new GlideRecord('cxs_ui_action_config');
		if (!gs.nil(trendRecId))
			uiActionConfigGR.addQuery('trend_recommendation', trendRecId);
		else if (gs.nil(searchResourceConfigSysId))
			uiActionConfigGR.addQuery('search_resource', searchResourceId);
		else
			uiActionConfigGR.addQuery('search_res_config', searchResourceConfigSysId);
		uiActionConfigGR.addQuery('search_ui_action', uiActionSysId);
		uiActionConfigGR.addQuery('search_ui_config', tableConfigSysId);
		uiActionConfigGR.query();
		return uiActionConfigGR;
	},

	deleteUACFromTableConfig: function(tableConfigSysId, newUIActionConfigs) {
		var uiActionConfigGR = new GlideRecord('cxs_ui_action_config');
		uiActionConfigGR.addQuery('search_ui_config', tableConfigSysId);
		uiActionConfigGR.addQuery('sys_id', 'NOT IN', newUIActionConfigs.join(','));
		uiActionConfigGR.addEncodedQuery("search_res_configISEMPTY^ORsearch_res_config.resource_type=");
		uiActionConfigGR.addQuery('trend_recommendation', '');
		uiActionConfigGR.deleteMultiple();
	},

	deleteAddUACFromTableConfig: function(tableConfigSysId, newUIActionConfigs) {
		var uiActionConfigGR = new GlideRecord('cxs_ui_action_config');
		uiActionConfigGR.addQuery('search_ui_config', tableConfigSysId);
		uiActionConfigGR.addQuery('sys_id', 'NOT IN', newUIActionConfigs.join(','));
		uiActionConfigGR.addEncodedQuery("search_res_configISNOTEMPTY^search_res_config.resource_type!=");
		uiActionConfigGR.addQuery('trend_recommendation', '');
		uiActionConfigGR.deleteMultiple();
	},
	
	deleteUACFromTrendRec: function(trendRecId, newUIActionConfigs) {
		if (!trendRecId)
			return;
		
		var uiActionConfigGR = new GlideRecord('cxs_ui_action_config');
		uiActionConfigGR.addQuery('trend_recommendation', trendRecId);
		uiActionConfigGR.addQuery('sys_id', 'NOT IN', newUIActionConfigs.join(','));
		uiActionConfigGR.deleteMultiple();
	},

	fixUpgradeToMadrid: function(isMainPlugin, tableConfigSysIds) {
		var uiConfigBaseGR = new GlideRecord("cxs_ui_config_base");
		uiConfigBaseGR.addQuery('sys_id', isMainPlugin ? 'NOT IN' : 'IN', tableConfigSysIds);
		uiConfigBaseGR.query();
		while (uiConfigBaseGR.next()) {
			this.buildUACFromTableConfig(uiConfigBaseGR);
			this.buildAddUACFromTableConfig(uiConfigBaseGR);
		}
		if (isMainPlugin) {
			gs.info("Now dropping the column 'ui_actions' from 'cxs_search_resource'.");
			gs.dropColumn('cxs_search_resource', 'ui_actions');
		}
	},

	type: 'cxs_UIActionConfig'
};
```