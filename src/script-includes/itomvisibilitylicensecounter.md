---
title: "ITOMVisibilityLicenseCounter"
id: "itomvisibilitylicensecounter"
---

API Name: global.ITOMVisibilityLicenseCounter

```js
var ITOMVisibilityLicenseCounter = Class.create();
ITOMVisibilityLicenseCounter.prototype = {	
    initialize: function() {
		this.utils = new sn_itom_license.ITOMLicensingUtils();
    },
	
	calculateUsage: function() {
		// is the new license model in place for this customer ?
		if (!this.utils.isNewLicenseModel())
			return;

		var metadata = new sn_itom_license.ITOMLicensingMetaData();
		var counts = this.utils.getCountsJsonTemplate();
		var allAllowedSources = this._getDiscoverySources();
		var excludedStatus = [ '7', '8', '100' ]; // RETIRED, STOLEN, ABSENT
		var dateFilter = 'Last 90 days@javascript:gs.beginningOfLast90Days()@javascript:gs.endOfLast90Days()';

		// for each applicable category
		for (var category in counts) {
			// NOTE: special case for enduser_devices where we *ONLY* want to count AgentClientCollector sourced CIs
			var allowedSources = (category == 'enduser_devices' ? ['AgentClientCollector'] : allAllowedSources);

			// get the list of tables that we need to count
			var tables = metadata.getTables(category);
			var totalCount = 0;

			// for each table that's found for a category
			for (var tableIndex in tables) {
				var tableName = tables[tableIndex];

				gs.info("\tprocessing table : " + tableName);
				var tableCountGr = new GlideAggregate(tableName);
				if (!tableCountGr.isValid())
					continue;

				tableCountGr.addAggregate('COUNT');

				this._addCountConditions(tableCountGr, excludedStatus, allowedSources, dateFilter);

				tableCountGr.query();

				if (tableCountGr.next())
					totalCount += parseInt(tableCountGr.getAggregate('COUNT'));
			}

			if (category == 'Servers') {
				// a VM can be discovered by both cloud discovery and IP based discovery to avoid
				// counting the same node twice, find the CI's that have a Virtualized by::Virtualizes
				// relationship between cmdb_ci_vm_instance and cmdb_ci_server
				// and deduct that from the total count
				var relGr = new GlideAggregate('cmdb_rel_ci');
				relGr.addAggregate('COUNT');
				// vm relationship to host can be either Instantiates::Instantiated by or Virtualized by::Virtualizes
				relGr.addQuery('type.name', 'IN', 'Instantiates::Instantiated by, Virtualized by::Virtualizes');

				this._addDeduplicationVmConditions(relGr, excludedStatus, allowedSources, dateFilter);

				relGr.query();

				if (relGr.next())
					totalCount -= parseInt(relGr.getAggregate('COUNT'));
			}

			// update the category counts
			counts[category] = totalCount;
		}

		// now persist the counts into the licensing counts table
		var countsGR = new GlideRecord('itom_lu_ci_counts');
		countsGR.setValue('value_stream', 'Visibility');
		countsGR.setValue('is_aggregated', 'false');

		for (var countedCategory in counts) {
			countsGR.setValue('category', countedCategory);
			countsGR.setValue('count', counts[countedCategory]);
			countsGR.insert();
		}
	},

	// NOTE: This function is overriden in ITOMVisibilityLicenseCounterWithServices
	_addCountConditions: function(tableCountGr, excludedStatus, allowedSources, dateFilter) {
		tableCountGr.addQuery('duplicate_of', 'NULL');
		tableCountGr.addQuery('install_status', 'NOT IN', excludedStatus);
		this._addSourceFilter(tableCountGr, 'sys_id', allowedSources, dateFilter);
	},

	// NOTE: This function is overriden in ITOMVisibilityLicenseCounterWithServices
	_addDeduplicationVmConditions: function(relGr, excludedStatus, allowedSources, dateFilter) {
		// filter first for conditions on parent side ...
		var serverQuery = relGr.addJoinQuery('cmdb_ci_server', 'parent', 'sys_id');
		serverQuery.addCondition('duplicate_of', 'NULL');
		serverQuery.addCondition('install_status', 'NOT IN', excludedStatus.join(","));
		this._addSourceFilter(relGr, 'parent', allowedSources, dateFilter);

		// then filter for conditions on child side ...
		var vmQuery = relGr.addJoinQuery('cmdb_ci_vm_instance', 'child', 'sys_id');
		vmQuery.addCondition('duplicate_of', 'NULL');
		vmQuery.addCondition('install_status', 'NOT IN', excludedStatus.join(","));
		this._addSourceFilter(relGr, 'child', allowedSources, dateFilter);
	},

	_addSourceFilter: function(gr, ref, allowedSources, dateFilter) {
		var sourceQuery = gr.addJoinQuery('sys_object_source', ref, 'target_sys_id');
		sourceQuery.addCondition('name', 'IN', allowedSources.join(","));
		sourceQuery.addCondition('last_scan', 'ON', dateFilter);
	},

	_getDiscoverySources: function() {
		var allowedSources = [];
		var licenseDiscoverySourceGr = new GlideRecord('itom_lu_discovery_sources');
		licenseDiscoverySourceGr.query();
		while (licenseDiscoverySourceGr.next())
			allowedSources.push(licenseDiscoverySourceGr.getValue('source'));

		return allowedSources;
	},

    type: 'ITOMVisibilityLicenseCounter'
};
```