---
title: "VCenterClustersSensor"
id: "vcenterclusterssensor"
---

API Name: global.VCenterClustersSensor

```js
/* jshint -W030 */

var VCenterClustersSensor;

// DiscoveryCMPUtils won't be available if cloud management isn't active.  Declaring
// this ensures that we won't get an exception when we check to see if it's active.
var DiscoveryCMPUtils;

(function() {

var vCenterSysId, vCenterUuid, datacenterMorId, datacenterSysId, _this,
	enableCmpApi,
	clusterMap = { },
	clusterOverrides = { },
	schema = {
		cmdb_ci_vcenter_cluster: {
			index: [ 'morid', 'vcenter_uuid' ],
			fixup: fixupCluster,
			preWriteRels: preWriteClusterRels,
			parentOf: {
				cmdb_ci_esx_server: 'Members::Member of',
				hostedOn: 'Hosted on::Hosts'
			},
			childOf: {
				cmdb_ci_vcenter_folder: 'Contains::Contained by',
				cmdb_ci_vcenter_datacenter: 'Contains::Contained by'
			}
		},
		cmdb_ci_esx_resource_pool: {
			index: [ 'morid', 'vcenter_uuid' ],
			fixup: fixupResourcePool,
			preWriteRels: preWriteResourcePoolRels,
			parentOf: {
				cmdb_ci_esx_server: 'Defines resources for::Gets resources from',
				cmdb_ci_vcenter_cluster: 'Defines Resources for::Gets resources from',
				cmdb_ci_vmware_instance: 'Members::Member of',
				hostedOn: 'Hosted on::Hosts',
				containedPools: 'Contains::Contained by'
			},
			childOf: {
				cmdb_ci_vcenter_datacenter: 'Contains::Contained by'
			}
		},
		cmdb_ci_drs_vm_config: {
			index: [ 'object_id', 'vcenter_ref' ],
			fixup: fixupVm
		}
	},
	args = {
		schema: schema
	};

VCenterClustersSensor = {
	process: process,
    type: "DiscoverySensor"
};

/*
Sample data.  Truncated for brevity, so possibly inconsistent:
{
  "hosts": [
    "host-1025"
  ],
  "pools": [
    {
      "morid": "resgroup-106",
      "name": "Resources",
      "owner": "DC0_C14",
      "owner_morid": "domain-c105",
      "cpu_reserved_mhz": 95968,
      "cpu_limit_mhz": 95968,
      "cpu_expandable": true,
      "mem_reserved_mb": 119744,
      "mem_limit_mb": 119744,
      "mem_expandable": true,
      "cpu_shares": 4000,
      "mem_shares": 163840,
      "fullpath": "DC0 | DC0_C14 | Resources"
    }
  ],
  "clusters": [
    {
      "morid": "domain-c105",
      "name": "DC0_C14",
      "cmdb_ci_vcenter_folder": "group-h4",
      "cmdb_ci_esx_server": [
        "host-1025",
        "host-113",
        "host-1205",
        "host-1387",
        "host-1564",
        "host-476",
        "host-654",
        "host-835"
      ],
      "effectivecpu": 95968,
      "effectivememory": 119744,
      "effectivehosts": 8,
      "numhosts": 8,
      "totalcpu": 95968,
      "totalmemory": 137402155008,
      "numcpucores": 32,
      "numcputhreads": 32
    }
  ]
}
*/
//////////////////////////////////////////////////////////////////////////
function process(result) {

	_this = this;

	getProbeParms();

	args.location = this.getLocationID();
	args.statusId = new DiscoveryStatus(g_probe.getParameter('agent_correlator')+'');
	args.mutexPrefix = datacenterMorId;

	// During normal discovery g_probe_parameters should always be defined.
	// It's only undefined during test execution.
	if (typeof g_probe_parameters != 'undefined') {
		g_probe_parameters.cidata = this.getParameter('cidata');
		g_probe_parameters.source = this.getParameter('source');
	}

	this.root = g_probe.getDocument().getDocumentElement();
	this.statusID = new DiscoveryStatus(g_probe.getParameter('agent_correlator')+'');

	output = JsonCi.reattach(output);

	VMUtils.triggerNextPage(_this, output.leftOverMors, [ 'disable_host_storage_probe', 'disable_host_probe' ]);

	args.results = { cmdb_ci_vcenter_cluster: output.clusters };
	JsonCi.prepare(args);
	JsonCi.writeJsObject(args);
	JsonCi.updateRelationships(args);
	enableCmpApi && DiscoveryCMPUtils.callCmpApi(args.results, vCenterUuid, datacenterMorId);

	args.results = { cmdb_ci_esx_resource_pool: output.pools };
	JsonCi.prepare(args);
	JsonCi.writeJsObject(args);
	JsonCi.updateRelationships(args);
	enableCmpApi && DiscoveryCMPUtils.callCmpApi(args.results, vCenterUuid, datacenterMorId);

	//This block helps when drs_enabled property at the cluster level changes from true to false.
	//In this case, we should delete the entry from cmdb_ci_drs_vm_config.
	//So, keeping track of all the clusters whether it has vm overrides or not.
	for (var clusterKey in clusterMap) {
		var clusterSysId = VMUtils.lookupSysIds(clusterKey, 'cmdb_ci_vcenter_cluster', vCenterSysId);
		clusterOverrides[clusterSysId] = clusterOverrides[clusterSysId] || [];
	}

	args.results = { cmdb_ci_drs_vm_config: output.drsVMOverrides };
	JsonCi.prepare(args);
	JsonCi.writeJsObject(args);

	//Delete entry from cmdb_ci_drs_vm_config if the VM overrides entry is removed from vcenter.

	for (var cluster in clusterOverrides) {
		var drsGlideRecord = new GlideRecord('cmdb_ci_drs_vm_config');
		drsGlideRecord.addQuery('cluster', cluster);
		drsGlideRecord.addQuery('virtual_machine', 'NOT IN', clusterOverrides[cluster]);
		drsGlideRecord.query();
		drsGlideRecord.deleteMultiple();
	}

	VMUtils.triggerProbes(_this, { host: output.hosts });
}

//////////////////////////////////////////////////////////////////////////
function getProbeParms() {
	vCenterSysId = '' + g_probe.getParameter('vcenter_sys_id');
	vCenterUuid = '' + g_probe.getParameter('vcenter_uuid');
	datacenterSysId = '' + g_probe.getParameter('datacenter_sys_id');
	datacenterMorId = '' + g_probe.getParameter('datacenter_mor_id');
	enableCmpApi = DiscoveryCMPUtils.isCmpActive() && (('' + g_probe.getParameter('enable_cmp_qa')) == 'true');
}

//////////////////////////////////////////////////////////////////////////
function fixupCluster(cluster) {
	cluster.vcenter_ref = vCenterSysId;
	cluster.vcenter_uuid = vCenterUuid;
	cluster.object_id = cluster.morid;

	clusterMap[cluster.object_id] = cluster;
}

//////////////////////////////////////////////////////////////////////////
function preWriteClusterRels(cluster) {
	cluster.cmdb_ci_esx_server = VMUtils.lookupSysIds(cluster.cmdb_ci_esx_server, 'cmdb_ci_esx_server', vCenterSysId, 'morid');
	cluster.cmdb_ci_vcenter_folder = VMUtils.lookupSysIds(cluster.cmdb_ci_vcenter_folder, 'cmdb_ci_vcenter_folder', vCenterSysId);

	if (!cluster.cmdb_ci_vcenter_folder)
		cluster.cmdb_ci_vcenter_datacenter = datacenterSysId;

	if (DiscoveryCMPUtils.isCmpActive())
		cluster.hostedOn = datacenterSysId;
}

//////////////////////////////////////////////////////////////////////////
function fixupResourcePool(pool) {
	pool.vcenter_ref = vCenterSysId;
	pool.vcenter_uuid = vCenterUuid;
	pool.object_id = pool.morid;
}

//////////////////////////////////////////////////////////////////////////
function preWriteResourcePoolRels(pool) {
	if (pool.host_morid)
		pool.cmdb_ci_esx_server = VMUtils.lookupSysIds(pool.host_morid, 'cmdb_ci_esx_server', vCenterSysId, 'morid');

	if (!pool.cmdb_ci_esx_server)
		pool.cmdb_ci_vcenter_cluster = VMUtils.lookupSysIds(pool.owner_morid, 'cmdb_ci_vcenter_cluster', vCenterSysId);
	if (!pool.cmdb_ci_vcenter_cluster && !pool.cmdb_ci_esx_server)
		pool.cmdb_ci_vcenter_datacenter = datacenterSysId;

	if (DiscoveryCMPUtils.isCmpActive())
		pool.hostedOn = datacenterSysId;

	pool.cmdb_ci_vmware_instance = pool.cmdb_ci_vmware_instance || VMUtils.lookupSysIds(pool.vm, 'cmdb_ci_vmware_instance', vCenterSysId);
}

//////////////////////////////////////////////////////////////////////////

	function fixupVm(vmConfig) {
		var overrides;

		vmConfig.vcenter_ref = vCenterSysId;
		vmConfig.vcenter_uuid = vCenterUuid;

		vmConfig.cluster = VMUtils.lookupSysIds(vmConfig.cluster, 'cmdb_ci_vcenter_cluster', vCenterSysId);
		vmConfig.virtual_machine = VMUtils.lookupSysIds(vmConfig.vm_morid, 'cmdb_ci_vmware_instance', vCenterSysId);
		vmConfig.vcenter_ref = vCenterSysId;
		vmConfig.object_id = vmConfig.vm_morid;

		/* clusterOverrides holds the map of Cluster - VM Overrides Pair
 	Key --> SysId of Cluster
 	Value --> SysIds of VMs that override cluster behavior

 	{
 	"6b729ed00b772300f198836266673a1b": ["3c9212140b772300f198836266673ae7"],
 	"a3729ed00b772300f198836266673a1e": ["f09212140b772300f198836266673aec", "389212140b772300f198836266673aea"]
 	}*/

		overrides = clusterOverrides[vmConfig.cluster] = clusterOverrides[vmConfig.cluster] || [];
		overrides.push(vmConfig.virtual_machine);
	}

})();

```