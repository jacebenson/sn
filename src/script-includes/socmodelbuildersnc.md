---
title: "SoCModelBuilderSNC"
id: "socmodelbuildersnc"
---

API Name: sn_chg_soc.SoCModelBuilderSNC

```js
var SoCModelBuilderSNC = Class.create();
SoCModelBuilderSNC.prototype = Object.extendsObject(SoC, {

	initialize: function(_gs) {
		SoC.prototype.initialize.call(this, null, _gs);
		// Style indexing
		// Default style rules for the keyed filtered table name in order of application
		this._defaultSR = {};
		// All styles which apply to the keyed definition id in order of application.
		// Includes defined and default
		this._definitionSR = {};
		// All styles rule definitions keyed by definition table name
		this._allSR = {};
		this._allSR[SoC.STYLE_RULE] = {};
		this._allSR[SoC.DEFINITION_STYLE_RULE] = {};
		this._allSR[SoC.DEFINITION_CHILD_STYLE_RULE] = {};

		// Container for the SoCDefinition for this builder if needed.
		this._def = null;
		this._childDef = null;
		this._defModel = null;
	},

	// Returns top level definitions with profiles
	definitionsWithProfile: function() {
		var socDefGr = SoCDefinition.findAll();
		var socDef = new SoCDefinition(socDefGr, this._gs);

		var definitions = [];
		var profiles = {};

		while (socDefGr.next()) {
			var defOwnerId = socDefGr.owner + "";
			// Add profile information
			if (!socDefGr.owner.nil() && !profiles[defOwnerId])
				profiles[defOwnerId] = new global.ChangeSoCUtil().getUserProfile(defOwnerId);
			definitions.push(socDef.toJS());
		}

		return {
			"chg_soc_definition": definitions,
			"__table_meta": socDef.metadataJS(),
			"__profiles": profiles
		};
	},

	buildModel: function(socDefId, changeCount, condition) {
		if (!socDefId)
			return null;

		var socDefGr = SoCDefinition.findById(socDefId);
		if (!socDefGr)
			return null;

		var model = {
			"__struct" : [],  // Record structure definition
			"__more" : false, // If there are more changes than those returned
			"__change_count": changeCount // Count of change_request records
		};

		model[SoC.CHANGE_REQUEST] = {};
		model[SoC.DEFINITION] = this.buildDefinitionModel(socDefGr);

		if (isNaN(changeCount))
			changeCount = 0;

		var limit = parseInt(gs.getProperty("sn_chg_soc.change_soc_initial_limit", "30"), 10);
		if (changeCount !== 0)
			limit = changeCount + SoC.LIMIT;

		var conflictConfig = {};
		if (!!socDefGr.show_blackout || !!socDefGr.show_maintenance) {
			conflictConfig.cmdb_ancestor = global.ChangeCheckConflicts.buildAncestorClassInfo("cmdb");
			conflictConfig.change_request_ancestor = global.ChangeCheckConflicts.buildAncestorClassInfo("change_request");
			conflictConfig.maintenance = this._findMaintenanceSchedules();
			conflictConfig.include_blackout_window = !!socDefGr.show_blackout;
			if (conflictConfig.include_blackout_window)
				conflictConfig.blackout = this._findBlackoutSchedules();
		}

		var chgReqGr = this._def.getRecords(changeCount, condition);
		var chgReqFields = SoCDefinition.getRequiredFields(socDefGr);
		var usedSchedules = {};
		var changeReqs = {};

		while (changeCount < limit && chgReqGr.next()) {
			changeCount++;
			var socChgReq = new SoCChangeRequest(chgReqGr, this._gs);

			var changeSysId = chgReqGr.getUniqueValue();
			changeReqs[changeSysId] = {
				"table_name": SoC.CHANGE_REQUEST,
				"sys_id": changeSysId,
				"style": this._getStyleReference(socDefId, chgReqGr),
				"schedule_window": {}, // Blackout/Maintenance spans
				"related": {}, // Related recored keyed by definition
				"more": {} // If there are more records for the related definition
			};

			// Add the change request to the flattened data if it doesn't exist
			if (!model.change_request[changeSysId])
				model.change_request[changeSysId] = this._toJSFields(chgReqGr, chgReqFields);

			// Add the change_request table meta data if it doesn't exist
			if (!model.change_request.__table_meta)
				model.change_request.__table_meta = this._metadataJSFields(chgReqGr, chgReqFields);

			// Add Maintenance/Blackout windows for this change_request
			if (!!socDefGr.show_blackout || !!socDefGr.show_maintenance)
				changeReqs[changeSysId].schedule_window = socChgReq.getScheduleSpans(socDefGr, conflictConfig, usedSchedules);
		}

		model = this._buildRelatedModel(model, changeReqs);

		if (chgReqGr.hasNext())
			model.__more = true;

		// Add the style definitions
		for (var styleTN in this._allSR)
			model[styleTN] = this._allSR[styleTN];

		model._css = this.getCSS();
		model.__change_count = changeCount;
		return model;
	},

	_buildRelatedModel: function(model, changeReqs) {
		for (var cdi = 0; cdi < this._childDef.length; cdi++) {
			var socDefChild = this._childDef[cdi];
			var socDefChildId = socDefChild._gr.getUniqueValue();

			var childRecGr = socDefChild.getAllRecords(Object.keys(changeReqs));
			if (childRecGr === null)
				return model;
			var childRecFields = SoCDefinitionChild.getRequiredFields(socDefChild._gr);
			var childTN = childRecGr.getTableName();

			while (childRecGr.next()) {
				var childSysId = childRecGr.getUniqueValue();
				// Add the related record to the flattened related data if it doesn't exist
				if (!model[childTN])
					model[childTN] = {};
				if (!model[childTN].__table_meta)
					model[childTN].__table_meta = this._metadataJSFields(childRecGr, childRecFields);
				if (!model[childTN][childSysId])
					model[childTN][childSysId] = this._toJSFields(childRecGr, childRecFields);
				model[childTN].__has_children = true;

				var changeSysId = childRecGr.getValue(socDefChild._gr.reference_field + "");
				if (!changeReqs[changeSysId].related[socDefChildId])
					changeReqs[changeSysId].related[socDefChildId] = [];
				// Add the related record reference to the change
				changeReqs[changeSysId].related[socDefChildId].push({
					"table_name" : childTN,
					"sys_id" : childSysId,
					"style" : this._getStyleReference(socDefChildId, childRecGr)
				});
			}
		}

		for (var changeId in changeReqs)
			if (changeReqs.hasOwnProperty(changeId))
				model.__struct.push(changeReqs[changeId]);

		return model;
	},

	// Builds the definition model, styles etc.
	buildDefinitionModel: function(socDefGr) {
		if (!socDefGr || !socDefGr.isValid() || !socDefGr.isValidRecord())
			return null;

		// If the model has already been built and it's the same as requested, just return it.
		if (this._def && this._def._gr.getUniqueValue() === socDefGr.getUniqueValue())
			return this._defModel;

		this._def = new SoCDefinition(socDefGr, this._gs);
		//Style information
		this._addDefaultStyleRules(this._def);
		this._addDefinitionStyleRules(this._def);

		this._childDef = [];
		var definition = this._def.toJS();
		definition.__table_meta = this._def.metadataJS();

		this._defModel = this._buildChildDefinition(definition, socDefGr);
		return definition;
	},

	_buildChildDefinition: function(definition, socDefGr) {
		var socDefChildGr = SoCDefinitionChild.findByDefId(socDefGr.getUniqueValue());
		var socDefChild = new SoCDefinitionChild(socDefChildGr, this._gs);
		if (socDefChildGr && socDefChildGr.hasNext()) {
			definition.__child = {
				"order": []
			};

			while (socDefChildGr.next()) {
				this._addDefaultStyleRules(socDefChild);
				this._addDefinitionStyleRules(socDefChild);
				definition.__child.order.push(socDefChildGr.getUniqueValue());
				definition.__child[socDefChildGr.getUniqueValue()] = socDefChild.toJS();

				// For repeatability store individual GlideRecords
				var csdgr = new GlideRecord(socDefChildGr.getTableName());
				csdgr.get(socDefChildGr.getUniqueValue());
				this._childDef.push(new SoCDefinitionChild(csdgr, gs));
			}
		}
		return definition;
	},

	_addDefinitionStyleRules: function(socDef) {
		if (!socDef)
			return null;

		var sysId = socDef._gr.getUniqueValue();
		var tableName = socDef._gr.table_name + "";
		// Already enumerated, return
		if (this._definitionSR[sysId] && this._definitionSR[sysId][tableName])
			return null;

		var styleRule = socDef.getStyleRules();
		var styles = [];
		while (styleRule._gr.next()) {
			var style = styleRule.toJS();
			this._allSR[styleRule._gr.getTableName() + ""][styleRule._gr.getUniqueValue() + ""] = style;
			styles.push(style);
		}

		// If we have default styles defined, add them as the last elements
		if (this._defaultSR[tableName])
			styles = styles.concat(this._defaultSR[tableName]);

		if (!this._definitionSR[sysId])
			this._definitionSR[sysId] = {};

		if (!this._definitionSR[sysId][tableName])
			this._definitionSR[sysId][tableName] = styles;
	},

	_addDefaultStyleRules: function(socDef) {
		if (!socDef)
			return null;

		var tableName = socDef._gr.table_name + "";
		// Already enumerated, return
		if (this._defaultSR[tableName])
			return null;

		var styleRuleGr = SoCStyleRule.findByTableName(tableName);
		var styleRule = new SoCStyleRule(styleRuleGr, this._gs);
		var styles = [];
		while (styleRuleGr.next()) {
			var style = styleRule.toJS();
			this._allSR[SoC.STYLE_RULE][styleRuleGr.getUniqueValue() + ""] = style;
			styles.push(style);
		}

		this._defaultSR[tableName] = styles;
	},

	getCSS: function() {
		var css = "";
		for (var table in this._allSR)
			if (this._allSR.hasOwnProperty(table))
				for (var sysId in this._allSR[table])
					if (this._allSR[table].hasOwnProperty(sysId))
						css += this._allSR[table][sysId].style.value + "\n";
		return css;
	},

	_findMaintenanceSchedules: function() {
		// Maintenance - ChangeCollisionHelper.getConditionalMaintenanceSchedules
		var maintenanceSchedules = [];
		var scheduleGR = new GlideRecord("cmn_schedule_maintenance");
		scheduleGR.addNotNullQuery("applies_to");
		scheduleGR.query();
		while (scheduleGR.next()) {
			maintenanceSchedules.push({
				sys_id : scheduleGR.sys_id.toString(),
				condition : scheduleGR.condition.toString(),
				name : scheduleGR.name.toString(),
				applies_to : scheduleGR.applies_to.toString()
			});
		}
		return maintenanceSchedules;
	},

	_findBlackoutSchedules: function() {
		var blackoutSchedules = [];
		var scheduleGR = new GlideRecord("cmn_schedule_blackout");
		scheduleGR.addQuery("type", "blackout");
		scheduleGR.query();
		while (scheduleGR.next()) {
			blackoutSchedules.push({
				sys_id : scheduleGR.sys_id.toString(),
				condition : scheduleGR.condition.toString(),
				name : scheduleGR.name.toString(),
				applies_to : scheduleGR.applies_to.toString()
			});
		}
		return blackoutSchedules;
	},

	// Returns a style reference to be applied to the provided record for the given definition
	_getStyleReference: function (defId, recordGr) {
		var recTN = recordGr.getTableName();
		if (this._definitionSR[defId] && this._definitionSR[defId][recTN]) {
			var styleRules = this._definitionSR[defId][recTN];
			for (var sri = 0; sri < styleRules.length; sri++) {
				if (!styleRules[sri].condition)
					continue;

				if (GlideFilter.checkRecord(recordGr, styleRules[sri].condition.value))
					return {
						table_name : styleRules[sri].sys_class_name.value,
						sys_id : styleRules[sri].sys_id.value
					};
			}
		}
		return null;
	},

	type: 'SoCModelBuilderSNC'
});
```