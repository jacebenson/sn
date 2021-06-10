---
title: "GlobalServiceCatalogUtil"
id: "globalservicecatalogutil"
---

API Name: global.GlobalServiceCatalogUtil

```js
var GlobalServiceCatalogUtil = Class.create();
GlobalServiceCatalogUtil.prototype = {
    initialize: function() {},
    _mergeScriptsInPolicies: function(policies, scripts) {
        for (var i = 0; i < policies.length; i++) {
            var policy = policies[i];
            var name = policy['script_true'];
            if (name) {
                policy['script_true'] = {
                    'name': name,
                    'script': scripts[name]
                };
            }
            name = policy['script_false'];
            if (name) {
                policy['script_false'] = {
                    'name': name,
                    'script': scripts[name]
                };
            }
        }
        return policies;
    },
    getCatalogUIPolicy: function(item, sets) {
        var builder = new CatalogUIPolicyBuilder();

        var gr = new GlideRecordSecure('catalog_ui_policy');
        gr.addActiveQuery();
        gr.addQuery('applies_to', 'item');
        gr.addQuery('catalog_item', item);
        gr.addQuery('applies_catalog', true);
        gr.orderBy('order');
        gr.query();
        builder.process(gr);

        if (sets) {
            sets = sets.split(',');
            for (var i = 0; i < sets.length; i++) {
                gr = new GlideRecord('catalog_ui_policy');
                gr.addActiveQuery();
                gr.addQuery('applies_to', 'set');
                gr.addQuery('catalog_item', item);
                gr.addQuery('applies_catalog', true);
                gr.orderBy('order');
                gr.query();
                builder.process(gr);
            }
        }
        builder.updateValues();
        return this._mergeScriptsInPolicies(builder.getFieldPolicies(), builder.getScripts());
    },

    stripScriptComments: function(script) {
        var sc = new global.JavaScriptCommentStripper().stripComments(script);
        sc.replaceAll('\r', '');
        return sc;

    },

    isWishListEnabled: function(catalogId) {
        //Checks if an item in a catalog can be added to wish list
        return new sn_sc.Catalog(catalogId).isWishlistEnabled();
    },

    getRequestForSysID: function(parentTable, parentID) {
        //returns the requestedForSysID for the given parentID and parentTable configuration
        var requestForSysID = '';
        if (JSUtil.notNil(parentID) && JSUtil.notNil(parentTable)) {
            var requestForField;
            var reqMapGR = new GlideRecord('request_parent_mapping');
            reqMapGR.addQuery('parent_table', parentTable);
            reqMapGR.query();
            if (reqMapGR.next()) {
                var recFound;
                requestForField = reqMapGR.requested_for_field;
                var parentRecGR = new GlideRecord(parentTable);
                if (parentRecGR.isValid()) {
                    recFound = parentRecGR.get(parentID);
                    if (recFound)
                        requestForSysID = parentRecGR.getValue(requestForField);
                }
            }
        }
        return requestForSysID;
    },

    getCatItemIconAltText: function(catItem) {
        //returns the catalog item icon's alt text
        var alt_text = '';
        if (JSUtil.notNil(catItem)) {
            alt_text = catItem.getName();
            var item_short_desc = catItem.getShortDescription();
            if (JSUtil.notNil(item_short_desc))
                alt_text = item_short_desc;
        }
        return alt_text;
    },

    isCatItemTable: function(tableName) {
        return GlideDBObjectManager.get().isInstanceOf(tableName, 'sc_cat_item');
    },

    getMaxRowCountMultiRowVS: function(variableSetId, srcTable, srcId) {
        return GlideappScriptHelper.getMaxRowCountMultiRowVS(variableSetId, srcTable, srcId);
    },

    canReadApprovingRecord: function(approvingRecordId) {
        var gr = new GlideRecord('sysapproval_approver');
        gr.addQuery('sysapproval', approvingRecordId);
        gr.addQuery('approver', 'IN', getMyApprovals());
        gr.query();
        if (gr.next())
            return true;

        return false;
    },

    getVariablesForTask: function( /*task GR*/ gr, /*with MRVS*/ withMRVS) {
        var result = [];
        if (!gr.isValidRecord())
			return result;
		
        var variables = gr.variables.getElements(withMRVS);
		for (var i = 0; i < variables.length; i++) {
			var variable = variables[i];
			if (!variable.canRead())
				continue;
			
			if (variable.isMultiRow()) {
				var rows = variable.getRows();
				var table_variable = [];
				for (var j = 0; j < rows.length; j++) {
					var row = rows[j];
					var cells = row.getCells();
					var column = [];
					for (var k = 0; k < cells.length; k++) {
						var cell = cells[k];
						column.push({
							name: cell.getName(),
							label: cell.getLabel(),
							display_value: cell.getCellDisplayValue()
						});
					}
					table_variable.push(column);
				}
				
				if (rows.length == 0)
					continue;
				
				result.push({
					label: variable.getLabel(),
					visible_summary: true,
					multi_row: true,
					table_variable: table_variable,
					name: variable.getName()
				});

			} else {
				var question = variable.getQuestion();
				if (!question.getValue() || question.getValue() == '')
					continue;
				
				result.push({
					label: variable.getLabel(),
					display_value: question.getDisplayValue(),
					visible_summary: question.isVisibleSummary(),
					multi_row: false,
					type: question.getType(),
					value : question.getValue(),
					state : question.getType() =='33' && !GlideStringUtil.nil(question.getValue()) ? new GlideSysAttachment(question.getValue()).getState() : undefined
				});
			}
		}
		return result;
    },
	
	getRelativeDuration: function(args) {
		var duration = new global.DurationCalculator();
		duration.setSchedule(args["schedule"]);
		duration.setTimeZone(args["timezone"]);
		duration.calcRelativeDuration(args["relative_duration"]);
		return duration.getEndDateTime();
	},
	
	isMultiRowVariableSet : function(variableSetSysId) {
		if(!GlideStringUtil.isEligibleSysID(variableSetSysId))
			return false;
		var gr = new GlideRecord("item_option_new_set");
		gr.get(variableSetSysId);
		if(gr.isValid() && gr.getValue('type') == 'one_to_many')
			return true;
		return false;
	},
	
	findCatItemsForSpLogs : function(cartItemGr) {
		//Seperating order guides from cart items
		var items = [];
		var orderGuideObj = {};
		while(cartItemGr.next()) {
			var orderGuideKey = cartItemGr.getValue('order_guide');
			if(orderGuideKey != null) {
				if(!orderGuideObj.hasOwnProperty(orderGuideKey))
					orderGuideObj[orderGuideKey]='';
			} else
				items.push(cartItemGr.getValue('cat_item'));
		}
		return items.concat(Object.keys(orderGuideObj));
	},
	
	logRequestedCatItems : function(requestedCatItems, portalId) {
		for (var i = 0; i < requestedCatItems.length; i++) {
			var catItem = new sn_sc.CatItem(requestedCatItems[i]).getItemSummary(true);
			GlideSPScriptable.logStat('Cat Item Request', catItem.sys_class_name, catItem.sys_id, catItem.name, portalId);
		}
	},

	getRequestedFor: function(parentParams) {
		var gr = new GlideRecord('request_parent_mapping');
		gr.setWorkflow(false);
		var requested_for = {};
		if (gr.get('parent_table', parentParams.sysparm_parent_table)) {
			var parent = new GlideRecord(parentParams.sysparm_parent_table);
			parent.get(parentParams.sysparm_parent_sys_id);
			if (JSUtil.notNil(parent.getValue(gr.requested_for_field))) {
				requested_for.id = parent.getValue(gr.requested_for_field);
				requested_for.displayValue = parent.getDisplayValue(gr.requested_for_field);
			}
		}
		return requested_for;
	},

    type: 'GlobalServiceCatalogUtil'
};
```