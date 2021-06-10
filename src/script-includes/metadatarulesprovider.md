---
title: "MetadataRulesProvider"
id: "metadatarulesprovider"
---

API Name: global.MetadataRulesProvider

```js
var MetadataRulesProvider = Class.create();
MetadataRulesProvider.prototype = {
	initialize: function() {
	},
	
	getMetadataRules: function() {
		var rules = [];
		var RUNS_ON = "60bc4e22c0a8010e01f074cbe6bd73c3";
		var HOSTED_ON = "5f985e0ec0a8010e00a9714f2a172815";
		var CONTAINS = "55c95bf6c0a8010e0118ec7056ebc54d";
		var CLUSTER_OF = "a99d39118f10310091769012cbbe4429";
		this._addRule(rules, "cmdb_ci", RUNS_ON, "cmdb_ci_hardware", false);
		this._addRule(rules, "cmdb_ci", HOSTED_ON,  "cmdb_ci_logical_datacenter", false);
		this._addRule(rules, "cmdb_ci_lb_service", HOSTED_ON,  "cmdb_ci_cloud_load_balancer", false);
		this._addRule(rules, "cmdb_ci_server", HOSTED_ON, "cmdb_ci_cluster_node", true);
		this._addRule(rules, "cmdb_ci", CONTAINS, "cmdb_ci_config_file_tracked", false);
		this._addRule(rules, "cmdb_ci_cluster_node", CLUSTER_OF, "cmdb_ci_cluster", false);
		this._addRule(rules, "cmdb_ci_cluster", CLUSTER_OF, "cmdb_ci_cluster_node", true);
		this._addRule(rules, "cmdb_ci_cluster_node", HOSTED_ON, "cmdb_ci_server", false);
		
		return JSON.stringify(rules);
	},
	
	_addRule: function(rules, parentClass, relType, childClass, reverse) {
		var rule = {};
			rule.parentClass = parentClass;
			rule.relType = relType;
			rule.childClass = childClass;
			rule.reverse = reverse;
			rules.push(rule);
		},
		
		type: 'MetadataRulesProvider'
	};
```