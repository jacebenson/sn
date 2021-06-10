---
title: "VMWarevCenterClusterDRSSensor"
id: "vmwarevcenterclusterdrssensor"
---

API Name: global.VMWarevCenterClusterDRSSensor

```js
/* jshint -W030 */

var VMWarevCenterClusterDRSSensor;

(function() {

    var vCenterSysId, vCenterUuid, datacenterMorId, datacenterSysId, _this, refreshOnly,
		clusterHostGroups = { },
		clusterVMGroups = { },
		clusterVMHostRules = { },
		clusterAffinityRules = { },
        schema = {
            cmdb_ci_vcenter_host_group: {
                index: ['cluster', 'name'],
				fixup: fixupHostGroup,
                preWriteRels: preWriteHostGroupRels,
				postWrite: postWriteGroups,
                parentOf: {
                    cmdb_ci_esx_server: 'Contains::Contained by'
                }
            },
			cmdb_ci_vcenter_vm_group: {
				index: ['cluster', 'name'],
				fixup: fixupVMGroup,
				preWriteRels: preWriteVMGroupAffinityRuleRels,
				postWrite: postWriteGroups,
				parentOf: {
					cmdb_ci_vmware_instance: 'Contains::Contained by'
				}
			},
            cmdb_ci_cluster_vm_host_rule: {
                index: ['cluster', 'rule_uuid'],
                fixup: fixupVMHostRules,
				postWrite: postWriteRules
            },
			cmdb_ci_cluster_vm_affinity_rule: {
				index: ['cluster', 'rule_uuid'],
				fixup: fixupAffinityRule,
				preWriteRels: preWriteVMGroupAffinityRuleRels,
				postWrite: postWriteRules,
				parentOf: {
					cmdb_ci_vmware_instance: 'Contains::Contained by'
				}
			}
        },
        args = {
            schema: schema
        };

    VMWarevCenterClusterDRSSensor = {
        process: process,
        type: "DiscoverySensor"
    };

    //////////////////////////////////////////////////////////////////////////
    function process(result) {
        _this = this;

        getProbeParms();

        args.location = this.getLocationID();
        args.statusId = new DiscoveryStatus(g_probe.getParameter('agent_correlator') + '');
        args.mutexPrefix = datacenterMorId;

        // During normal discovery g_probe_parameters should always be defined.
        // It's only undefined during test execution.
        if (typeof g_probe_parameters != 'undefined') {
            g_probe_parameters.cidata = this.getParameter('cidata');
            g_probe_parameters.source = this.getParameter('source');
        }

        this.root = g_probe.getDocument().getDocumentElement();
        this.statusID = new DiscoveryStatus(g_probe.getParameter('agent_correlator') + '');

        output = JsonCi.reattach(output);

        VMUtils.triggerNextPage(_this, output.leftOverMors);

        args.results = {
            cmdb_ci_vcenter_host_group: output.hostGroups,
			cmdb_ci_vcenter_vm_group: output.vmGroups,
			cmdb_ci_cluster_vm_affinity_rule: output.vmAffinityRules
        };

        JsonCi.prepare(args);
        JsonCi.writeJsObject(args);
        JsonCi.updateRelationships(args);
		
		args.results = {
            cmdb_ci_cluster_vm_host_rule: output.vmHostRules
        };

        JsonCi.prepare(args);
        JsonCi.writeJsObject(args);
        JsonCi.updateRelationships(args);

        deleteGroupOrRuleRecords('cmdb_ci_vcenter_host_group', clusterHostGroups);
		deleteGroupOrRuleRecords('cmdb_ci_vcenter_vm_group', clusterVMGroups);
        deleteGroupOrRuleRecords('cmdb_ci_cluster_vm_host_rule', clusterVMHostRules);
		deleteGroupOrRuleRecords('cmdb_ci_cluster_vm_affinity_rule', clusterAffinityRules);
    }

    //////////////////////////////////////////////////////////////////////////
    function getProbeParms() {
        vCenterSysId = '' + g_probe.getParameter('vcenter_sys_id');
        vCenterUuid = '' + g_probe.getParameter('vcenter_uuid');
        datacenterSysId = '' + g_probe.getParameter('datacenter_sys_id');
        datacenterMorId = '' + g_probe.getParameter('datacenter_mor_id');
    }

    function fixupVMHostRules(vmHostRule) {
        //holds the map of the 'cluster = rules' pair. This will be used to delete the records from cmdb if the same is deleted from vcenter.
        var rules;
        var clustersysId = VMUtils.lookupSysIds(vmHostRule.cluster.morid, 'cmdb_ci_vcenter_cluster', vCenterSysId);

        rules = clusterVMHostRules[clustersysId] = clusterVMHostRules[clustersysId] || [];
        rules.push(vmHostRule.name);

        vmHostRule.vm_group = lookupSysIds(vmHostRule.vm_group, 'cmdb_ci_vcenter_vm_group', clustersysId, 'name');
        vmHostRule.host_group = lookupSysIds(vmHostRule.host_group, 'cmdb_ci_vcenter_host_group', clustersysId, 'name');
		vmHostRule.cluster.sys_id = clustersysId;
    }
	
	function fixupVMGroup(vmGroup) {
		//holds the map of the 'cluster = vm-groups' pair. This will be used to delete the records from cmdb if the same is deleted from vcenter.
		var groups;
		var clustersysId = VMUtils.lookupSysIds(vmGroup.cluster.morid, 'cmdb_ci_vcenter_cluster', vCenterSysId);
		groups = clusterVMGroups[clustersysId] = clusterVMGroups[clustersysId] || [];
		groups.push(vmGroup.name);
		
		vmGroup.cluster.sys_id = clustersysId;
	}
	
	function fixupHostGroup(hostGroup) {
		//holds the map of the 'cluster = vm-groups' pair. This will be used to delete the records from cmdb if the same is deleted from vcenter.
		var groups;
		var clustersysId = VMUtils.lookupSysIds(hostGroup.cluster.morid, 'cmdb_ci_vcenter_cluster', vCenterSysId);
		
		groups = clusterHostGroups[clustersysId] = clusterHostGroups[clustersysId] || [];
		groups.push(hostGroup.name);

		hostGroup.cluster.sys_id = clustersysId;
	}

	function preWriteHostGroupRels(hostGroup) {
		hostGroup.cmdb_ci_esx_server = VMUtils.lookupSysIds(hostGroup.host, 'cmdb_ci_esx_server', vCenterSysId, 'object_id');
	}
	
	function fixupAffinityRule(affinityRule) {
		//holds the map of the 'cluster = affinity vm' pair. This will be used to delete the records from cmdb if the same is deleted from vcenter.
		var groups;
		var clustersysId = VMUtils.lookupSysIds(affinityRule.cluster.morid, 'cmdb_ci_vcenter_cluster', vCenterSysId);
		groups = clusterAffinityRules[clustersysId] = clusterAffinityRules[clustersysId] || [];
		groups.push(affinityRule.name);
		
		affinityRule.cluster.sys_id = clustersysId;
	}
	
	function preWriteVMGroupAffinityRuleRels(vmGroup) {
		vmGroup.cmdb_ci_vmware_instance = VMUtils.lookupSysIds(vmGroup.vm, 'cmdb_ci_vmware_instance', vCenterSysId, 'object_id');
	}
	
    //Deletes an entry from cmdb_ci_host_group/cmdb_ci_vm_group/cmdb_ci_vcenter_cluster_drs_rule/cmdb_ci_cluster_vm_affinity_rule if the setting is removed from vcenter cluster.
    function deleteGroupOrRuleRecords(table, settingsObject) {
        for (var cluster in settingsObject) {
            var groupOrRuleGR = new GlideRecord(table);
            groupOrRuleGR.addQuery('cluster', cluster);
            groupOrRuleGR.addQuery('name', 'NOT IN', settingsObject[cluster]);
            groupOrRuleGR.query();
            groupOrRuleGR.deleteMultiple();
        }
    }

    //we can't use the lookupSysIds from 'VMUtils'. The check on the 'VMUtils.lookupSysIds' is always based on vCenterSysId which don't exist in this table.
    function lookupSysIds(name, table, cluster, morColumn) {
        var gr = new GlideRecord(table);
        gr.addQuery('cluster', cluster);
        gr.addQuery(morColumn, name);
        gr.query();

        if (gr.next())
            return gr.sys_id;
    }
	
	function deleteDuplicatesifExists(table, cluster, column, value) {
		//Do a duplicate check on the record based on the indexes and delete the duplicate records from different tables
		//Duplicates will be created only if the DRSSensor triggers at the same time after ESX & VM Sensor completes it's processing.
		var gr = new GlideRecord(table);
		gr.addQuery(column, value);
		gr.addQuery('cluster', cluster);
		gr.query();
		gr.next();
		while (gr.next()) {
			gr.deleteRecord();
			gs.info(gs.getMessage('Deleted duplicate record from table {0} with values cluster - {1} and {2} - {3}', [table, cluster, column, value]));
		}
	}
	
	function postWriteRules(rule) {
		deleteDuplicatesifExists(rule.sys_class_name, rule.cluster.sys_id, 'rule_uuid', rule.rule_uuid);
	}
	
	function postWriteGroups(group) {
		deleteDuplicatesifExists(group.sys_class_name, group.cluster.sys_id, 'name', group.name);
	}

})();
```