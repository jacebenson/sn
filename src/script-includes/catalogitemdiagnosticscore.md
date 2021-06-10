---
title: "CatalogItemDiagnosticScore"
id: "catalogitemdiagnosticscore"
---

API Name: global.CatalogItemDiagnosticScore

```js
var CatalogItemDiagnosticScore = Class.create();
CatalogItemDiagnosticScore.prototype = Object.extendsObject(DiagnosticScore, {
    SELECT_BOX_TYPE: 5,
    TABLE_VARIABLE: 'item_option_new',
    TABLE_CATALOG_CLIENT_SCRIPT: 'catalog_script_client',
	TABLE_CATALOG_ITEM: 'sc_cat_item',
	TABLE_RULE_BASE: "sc_cat_item_guide_items",

    process: function(gr, catItemSysId) {
		this.check('checkBalancedContainers', this.checkBalancedContainers, gr, catItemSysId);
        this.check('checkDuplicateVariables', this.checkDuplicateVariables, gr, catItemSysId);
        this.check('checkAJAX', this.checkClientScriptsForAjax, gr, catItemSysId);
        this.check('checkDOMManipulation', this.checkClientScriptsForDom, gr, catItemSysId);
        this.check('checkSelectBoxUnique', this.checkSelectBoxUniqueLookup, gr, catItemSysId);
		this.check('checkUserCriteriaUsage', this.checkUserCriteriaUsage, gr, catItemSysId);
		this.check('checkOrderGuideRuleBaseCount', this.checkOrderGuideRuleBaseCount, gr, catItemSysId);
		this.check('checkLookupVariableRowCount', this.checkLookupVariableRowCount, gr, catItemSysId);
		this.check('checkFormatterVariablesUsage', this.checkFormatterVariablesUsage, gr, catItemSysId);
    },

    /* Check for Balanced Containers */
    checkBalancedContainers: function(catItemGR, catItemSysId) {
		var containerStart = 0;
		var containerEnd = 0;
		var options = GlideappCatalogItem.get(catItemSysId).getVariables();
		while(options.next()) {
			if (options.type == 19 || options.type == 20) {
				if (options.type == 19)
					containerStart++;
				else if (options.type == 20){
					if (containerStart > 0)
						containerStart--;
					else
						containerEnd++;
				}
			}
		}
		var res = [];
		if (containerEnd || containerStart) {
			var resObj = {};
			resObj.details = "'Container Start' variables : " + containerStart + ".<br/>'Container End' variables : " + containerEnd + ".<br/><strong>*Both types of variables must be paired & indented for normal behaviour.<br/>*If there are more 'Container End' before 'Container Start', then, they are not finely indented.)</strong>";
			res.push(resObj);
		}
        return {result: res, score: containerEnd + containerStart, table: this.TABLE_VARIABLE};
    },

    /* Check for duplicate variables */
    checkDuplicateVariables: function(catItemGR, catItemSysId) {
        var variablesDictionary = {};
        var variableSets = this._getItemVariableSets(catItemSysId);

        var catItemQuery = {column: 'cat_item', value: catItemSysId, or:[]};
        this._forEach(variableSets, function(variableSet) {
            catItemQuery.or.push({column: 'variable_set', value: variableSet});
        });

        /* Store all associated variables in a hash table with the name as key */
        this._forEachGR(this.TABLE_VARIABLE, [catItemQuery, {column:'active', value:'true'}], function(gr) {
			// Skipping duplicate check for 'formatter' variables
			if(gr.type == 12 || gr.type == 20 || gr.type == 24)
				return;
            var name = gr.name+'';
            if (variablesDictionary[name] == undefined) {
                variablesDictionary[name] = [];
            }
            variablesDictionary[name].push({name:name, sys_id:gr.sys_id+'', variableSet: gr.variable_set+'', variableSetName: gr.variable_set.name+''});
        });

        var duplicateVariables = [];
        for (var key in variablesDictionary) {
            if (variablesDictionary.hasOwnProperty(key) && variablesDictionary[key].length > 1) {

            	for(var i = 0; i < variablesDictionary.length; i++) {
            		var resultObj = {name: key, sys_id: variablesDictionary[i].sys_id};
                    if (variablesDictionary[i].variableSet.length)
                        resultObj.details = "Duplicate name for variable '" + key + "' associated with the variable set: '" + variablesDictionary[i].variableSetName + "'";
                    else
                        resultObj.details = "Duplicate name for variable '" + key + "' associated with this catalog item";

                    duplicateVariables.push(resultObj);
					
				}
            }
        }

        return {result: duplicateVariables, score: duplicateVariables.length, table: this.TABLE_VARIABLE};
    },

    /* Check client scripts for AJAX calls */
    checkClientScriptsForAjax: function(catItemGR, catItemSysId) {
        /* Search strings are escaped for being used as RegExp */
        var searchStrings = ['GlideRecord', '\\$http', 'GlideAjax', '\\$\\.get', '\\$\\.post', '\\$\\.ajax'];
        var matchedScripts =  this.searchCode(catItemSysId, this.TABLE_CATALOG_CLIENT_SCRIPT, searchStrings);

        return {result: matchedScripts, score: matchedScripts.length, table: this.TABLE_CATALOG_CLIENT_SCRIPT};
    },

    /* Check client scripts for DOM Manipulation */
    checkClientScriptsForDom: function(catItemGR, catItemSysId) {
        var searchStrings = ['^\\$\\$\\(', '\\$\\$\\(', '\\$j\\(', 'getElementById', 'getElementsByClassName', 'getElementsByTagName', 'getElementsByName', 'gel\\('];
        var matchedScripts = this.searchCode(catItemSysId, this.TABLE_CATALOG_CLIENT_SCRIPT, searchStrings);

        return {result: matchedScripts, score: matchedScripts.length, table: this.TABLE_CATALOG_CLIENT_SCRIPT};
    },

    /* Check for select box variables for unique-lookup-checkbox */
    checkSelectBoxUniqueLookup: function(catItemGR, catItemSysId) {
        var messedUpVariables = [];
        var associatedVariableSets = this._getItemVariableSets(catItemSysId);

        /* Build the query: CAT_ITEM is catItemSysId OR VARIABLE_SET is any of the associated vsets */
        var catItemQuery = {column: 'cat_item', value: catItemSysId, or: []};
        this._forEach(associatedVariableSets, function(variableSet) {
            catItemQuery.or.push({column: 'variable_set', value: variableSet});
        });

        /* Check all the variables associated with the catalog item or any of its variable sets */
        var queries = [catItemQuery,
                       {column: 'type', value: this.SELECT_BOX_TYPE},
                       {column: 'lookup_unique', value: true}];

        this._forEachGR(this.TABLE_VARIABLE, queries, function(gr) {
            messedUpVariables.push({
                name: gr.name+'',
                sys_id: gr.sys_id+'',
                details: "Variable '" + gr.name + "' has the unique lookup attribute enabled. This may lead to performance issues."
            });
        });

        return {result: messedUpVariables, score: messedUpVariables.length, table:this.TABLE_VARIABLE};
    },
	
	/* Checks if the item is using entitlements instead of user criteria */
	checkUserCriteriaUsage: function(catItemGR, catItemSysId) {
		var entitlements = [];

		/* check if the instance is not using user criteria */
		if (gs.getProperty('glide.sc.use_user_criteria', 'false') === 'false') {
			var resultObj = {
				name: catItemGR.name + '',
				sys_id: catItemSysId + '',
				details: 'The catalog has been configured to use entitlements which is legacy. Switch to user criteria instead.'
			};
			entitlements.push(resultObj);
		}
		return {result: entitlements, score: entitlements.length, table: this.TABLE_CATALOG_ITEM};
	},

		
	/* Checks for high number of active rule bases in an Order Guide as higher number of rule bases can potentially lead to slower load times */
	
	checkOrderGuideRuleBaseCount: function (catItemGR, catItemSysId) {
		var ruleBases = new GlideRecord(this.TABLE_RULE_BASE);
		ruleBases.addQuery("guide", catItemSysId);
		ruleBases.query();
		var rbCount = ruleBases.getRowCount();
		var score = 0;
		if (rbCount > 500)
			score = 5;
		else if (rbCount > 100)
			score = 3;
		else if (rbCount > 50)
			score = 1;
		
		var result = [];
		if (score > 0) {
			var resObj = {};
			resObj.details = "High number of rule bases in the Order Guide can result in a slower experience";
			result.push(resObj);
		}
		return{
			result: result,
			score: score,
			table: this.TABLE_RULE_BASE
		};
	},
	
	/* Checks for high number of options in the lookup  variable type as higher number of options  can potentially lead to slower load times */
	
    checkLookupVariableRowCount: function(catItemGR, catItemSysId) {
		var lookupVariables = [];
        var associatedVariableSets = this._getItemVariableSets(catItemSysId);
        var catItemQuery = {
            column: 'cat_item',
            value: catItemSysId,
            or: []
        };
        this._forEach(associatedVariableSets, function(variableSet) {
            catItemQuery.or.push({
                column: 'variable_set',
                value: variableSet
            });
        });
		
		var typeQuery = {
			column: 'type',
			value: 22,
			or: [{column: "type", value: "18"}]
		};
		
		var activeQuery = {
			column: 'active',
			value: 'true',
			or: []
		};
		
		var queries = [catItemQuery, typeQuery, activeQuery];
		var totalScore = 0;
        this._forEachGR(this.TABLE_VARIABLE, queries, function(gr) {
			var lookup_score = 0;
			var table = gr.lookup_table.getValue();
			var reference_qualifier = gr.reference_qual;
			var record = new GlideRecord(table);
			if (!(reference_qualifier.startswith('javascript')))
				record.addQuery(reference_qualifier);
			record.query();
			var count = record.getRowCount();
			if (count > 1000)
				lookup_score = 5;
			else if (count > 100)
				lookup_score = 3;
			else if (count > 50)
				lookup_score = 1;
				
			totalScore = totalScore + lookup_score;
			
			if (lookup_score > 0) {
				lookupVariables.push({
					name: gr.name + '',
					sys_id: gr.sys_id + '',
					details: "High number of options in the lookup variable type can result in slower rendering and non-optimal user experience. Use reference instead."
					
				});
			}
        });
		
		return {
            result: lookupVariables,
            score: totalScore,
            table: this.TABLE_VARIABLE
        };
    },


	/* Checks if the item has the following variable types:
		1. Macro
		2. Macro with label
		3. UI Page variable type */
    
	checkFormatterVariablesUsage: function(catItemGR, catItemSysId) {
        var associatedVariableSets = this._getItemVariableSets(catItemSysId);
		var record = new GlideRecord("item_option_new");
		var qc = record.addQuery("cat_item", catItemSysId);
        this._forEach(associatedVariableSets, function(variableSet) {
			qc.addOrCondition('variable_set', variableSet);
        });
		record.addEncodedQuery('type=14^ORtype=15^ORtype=17');
		record.addActiveQuery();
		record.query();
		var score = record.getRowCount();
		var result = [];
		if (score > 0) {
			var resObj = {};
			resObj.details = "The item has variables of type UI Page, Macro or Macro with Label which are not supported in Agent Workspace, Mobile and VA conversations";
			result.push(resObj);
		}
		return {
            result: result,
            score: score,
            table: this.TABLE_VARIABLE
        };
		
    },
				
    searchCode: function(catItemSysId, table, searchStrings) {
        /* Get associated variable sets */
        var variableSets = this._getItemVariableSets(catItemSysId);

        /* Build the query: CAT_ITEM is thisItem OR VARIABLE_SET is anyAssociatedSet */
        var catItemQuery = {column: 'cat_item', value: catItemSysId, or:[]};
        this._forEach(variableSets, function(variableSet) {
            catItemQuery.or.push({column: 'variable_set', value: variableSet});
        });
        var queries = [catItemQuery];

        return this._searchCode(table, queries, 'script', searchStrings);
    },

    _getItemVariableSets: function(catItemSysId) {
        var variableSets = [];

        // Query all variable sets that are associated with this catalog item
        this._forEachGR('io_set_item', [{column: 'sc_cat_item', value: catItemSysId}], function(gr) {
            variableSets.push(gr.variable_set+'');
        });

        return variableSets;
    },

    type: 'CatalogItemDiagnosticScore'
});
```