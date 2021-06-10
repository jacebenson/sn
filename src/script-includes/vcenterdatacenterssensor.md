---
title: "VCenterDatacentersSensor"
id: "vcenterdatacenterssensor"
---

API Name: global.VCenterDatacentersSensor

```js
/* jshint -W030 */

var VCenterDatacentersSensor;

// DiscoveryCMPUtils won't be available if cloud management isn't active.  Declaring
// this ensures that we won't get an exception when we check to see if it's active.
var DiscoveryCMPUtils;

var g_device;

(function() {

var vCenterSysId, vCenterUuid, _this, locationID, statusID,
	allFolders = [ ],
	allVms = [ ],
	allDatastores = [ ],
	allNetworks = [ ],
	allClusters = [ ],
	allHosts = [ ],
	allPools = [ ],
	allDatacenters = [ ],
	folderSchema = {
		cmdb_ci_vcenter_folder: {
			index: [ 'morid', 'vcenter_uuid' ],
			fixup: fixupFolder,
			parentOf: {
				cmdb_ci_vcenter_folder: 'Contains::Contained by'
			},
			childOf: {
				cmdb_ci_vcenter_datacenter: 'Contains::Contained by'
			}
		}
	};

VCenterDatacentersSensor = {
	process: process,
	handleError: handleError,
	after: function() { this.updateObjectSource(current); },
	type: "DiscoverySensor"
};

if (DiscoveryCMPUtils.isCmpActive())
	folderSchema.cmdb_ci_vcenter_folder.parentOf.hostedOn = 'Hosted on::Hosts';

/*
Sample data:
{
  "vcenter": {
    "type": "ServiceInstance",
    "morid": "ServiceInstance",
    "name": "VMware vCenter Server",
    "version": "5.5.0",
    "fullname": "VMware vCenter Server 5.5.0 build-3252642 (Sim)",
    "api_version": "5.5",
    "instance_uuid": "D877AC10-0803-40C2-AE74-F66F99671D64",
    "url": "https:\/\/10.11.128.135\/sdk"
  },
  "cmdb_ci_vcenter_datacenter": [
    {
      "type": "Datacenter",
      "morid": "datacenter-2",
      "name": "DC0",
      "folder_morid": "group-v3",
      "host_morid": "group-h4",
      "folders": {
        "type": "Datacenter",
        "morid": "datacenter-2",
        "name": "DC0",
        "datastoreFolder": {
          "type": "Folder",
          "morid": "group-s5",
          "name": "datastore",
          "childEntity": [
            {
              "type": "Datastore",
              "morid": "datastore-170",
              "name": "SANLAB1DS_DC0_C0_0"
            }
          ]
        },
        "hostFolder": {
          "type": "Folder",
          "morid": "group-h4",
          "name": "host",
          "childEntity": [
            {
              "type": "ClusterComputeResource",
              "morid": "domain-c105",
              "name": "DC0_C14"
            }
          ]
        },
        "networkFolder": {
          "type": "Folder",
          "morid": "group-n6",
          "name": "network",
          "childEntity": [
            {
              "type": "Network",
              "morid": "network-7",
              "name": "VM Network"
            }
          ]
        },
        "vmFolder": {
          "type": "Folder",
          "morid": "group-v3",
          "name": "vm",
          "childEntity": [
            {
              "type": "VirtualMachine",
              "morid": "vm-4373",
              "name": "DC0_C1_RP2_VM11"
            }
          ]
        }
      }
    }
  ],
  "hosts": [
    "host-1025"
  ],
  "pools": [
    "resgroup-106"
  ]
}
*/
//////////////////////////////////////////////////////////////////////////
function process(result) {

	var vCenter, vcGr, serviceAccount,
		args = {
			leaveCurrent: 1,
			schema: {
				cmdb_ci_vcenter_datacenter: {
					index: [ 'morid', 'vcenter_uuid' ],
					fixup: fixupDatacenter,
					childOf: {
						managedBy: 'Manages::Managed by'
					},
					parentOf: {
						hostedBy: 'Hosted on::Hosts'
					}
				},
				cmdb_ci_cloud_service_account: {
					index: [ 'account_id' ],
				}
			}
		};

	if (!g_device)
		g_device = DeviceHistory.createDeviceHistory(source, null, this.getEccQueueId());

	// This disables the triggering of the associated probes.  Triggering
	// of probes will be handled dynamically below in processDatacenter
	this.setTriggerProbes(false);

	_this = this;
	locationID = this.getLocationID();
	statusID = new DiscoveryStatus(g_probe.getParameter('agent_correlator')+'');

	// During normal discovery g_probe_parameters should always be defined.
	// It's only undefined during test execution.
	if (typeof g_probe_parameters != 'undefined') {
		g_probe_parameters.cidata = this.getParameter('cidata');
		g_probe_parameters.source = this.getParameter('source');
	}

	output = JSON.parse(output);

	args.results = output;
	args.location = locationID;
	args.statusId = statusID;

	vCenter = output.vcenter;
	vCenterUuid = vCenter.instance_uuid;

	// The CM API requires an association between the datacenter and a
	// service account.  Create it if CMP has been activated.
	if (DiscoveryCMPUtils.isCmpActive()) {
		var accountName = "";
		var ip = '' + g_probe.getSource();

		if (ip)
			accountName = 'vCenter ServiceAccount@' + ip;

		accountName = accountName || vCenter.name || vCenter.fullName || vCenter.url || "vCenter Auto Generated Account (" + vCenterUuid + ")";
		
		serviceAccount = {
			datacenter_type: "cmdb_ci_vcenter_datacenter",
			name: accountName,
			account_id: vCenterUuid,
			object_id: vCenterUuid
		};
		
		// Cloud service account created for the vCenter can have the datacenter_url field with the IP or FQDN or no value
		// We update the datacenter_url field only if there is no value at all inorder to preserve the FQDN/IP information, if exists
		var cloudServiceAccountGR = new GlideRecord('cmdb_ci_cloud_service_account');
		if (!cloudServiceAccountGR.get('account_id', vCenterUuid) || !cloudServiceAccountGR.getValue('datacenter_url'))
			serviceAccount.datacenter_url = vCenter.url || "";
		
		args.results.cmdb_ci_cloud_service_account = [ serviceAccount ];

		args.results.cmdb_ci_vcenter_datacenter.forEach(
			function(dc) {
				dc.hostedBy = serviceAccount;
				dc.region = dc.name;
			});
	}

	if (current) {
		current.url = vCenter.url;
		current.fullname = vCenter.fullname;
		current.api_version = vCenter.api_version;
		current.instance_uuid = vCenterUuid;
		this.addDiscoveryCiStuff(current);
	}

	// Check for the vCenter CI
	var ip = '' + g_probe.getSource();
	var thisCmdbRecord = this.getCmdbRecord();

	// The probe may have been triggered via process classifier or port probe.  If it was triggered
	// by the process classifier then we expect to have thisCmdbRecord and we can use the sys_id
	// to get the vCenter record.  Unfortunately we sometimes get thisCmdbRecord even when triggered
	// by the port probe, but in this case the sys_id is wrong.  I'm not sure what causes this to happen
	// but we need to guard against it.

	vcGr = new GlideRecord('cmdb_ci_vcenter');
	if (thisCmdbRecord)   // This should mean that the probe was triggered via process classifier
		vcGr.addQuery('sys_id', thisCmdbRecord.sys_id);
	else  // This should mean the probe was triggered via port probe
		vcGr.addQuery('instance_uuid', vCenterUuid);

	vcGr.query();
	if (!vcGr.next()) {
		// There's no existing vcenter record for this sys_id/uuid... check ip address
		vcGr.initialize();
		vcGr.addQuery('ip_address', ip);
		vcGr.query();

		if(!vcGr.next()) {
			vcGr.initialize();
			vcGr.ip_address = ip;
			vcGr.instance_uuid = current.instance_uuid;
			vcGr.name = 'vCenter@' + ip;
		}
	}
	else {
		vcGr.ip_address = ip;
		if (/^vCenter@(?:\d{1,3}.){3}\d{1,3}$/.test(vcGr.name))
			vcGr.name = "vCenter@" + ip;
	}
	this.addDiscoveryCiStuff(vcGr);
	vcGr.update();

	vCenterSysId = '' + vcGr.getUniqueValue();

	// vcGr now points to the correct vCenter record.  If we were triggered via process classifier
	// this is the record created by the process classifier, otherwise it's the record with the right
	// UUID.

	if (JSUtil.notNil(g_device))
		g_device.setCISysID(vCenterSysId);

	// If we were triggered by a process classifier then we may have a duplicate record.  Since we may not
	// know how we were triggered we will always check and remove any extra vCenter records.
	vcGr.initialize();
	var qc = vcGr.addQuery('instance_uuid', current.instance_uuid);
	qc.addOrCondition('ip_address', ip);
	vcGr.query();
	while (vcGr.next()) {
		if (vcGr.sys_id + '' != vCenterSysId)
			vcGr.deleteRecord();
	}

	// Create a Runs on::Runs relationship if necessary
	runsOnRelForCredentialless(vCenterSysId, ip);

	// This writes only the datacenter records.
	JsonCi.prepare(args);
	JsonCi.writeJsObject(args);
	JsonCi.writeRelationships(args);

	if (('' + g_probe.getParameter('datacenters_only')) != 'true') {
		JsonCi.iterate(processDatacenter, args);
		updateStaleness();
	}
}

function handleError(errors) {
	// Only do this if we were triggered by port probe NOT process classifier
	if (!this.getCmdbRecord()) {
		DiscoverySensor.prototype.handleError.call(this, errors, {
			sourceName: 'VMWare - vCenter Datacenters',
			lastState: DiscoverySensor.HistoryStates.ACTIVE_COULDNT_CLASSIFY,
			deviceState: DiscoverySensor.DeviceStates.REJECTED,
			fireClassifiers: true
		});
	} else {
		DiscoverySensor.prototype.handleError.call(this, errors);
	}
}

//////////////////////////////////////////////////////////////////////////
function runsOnRelForCredentialless(vCenterSysId, ip_address) {
	var newGr,
		runsOnRelSysId = '60bc4e22c0a8010e01f074cbe6bd73c3',    // Runs on::Runs
		gr = new GlideRecord('cmdb_rel_ci');

	// 1st check to see if there's already a Runs on::Runs relationship.
	gr.addQuery('parent', vCenterSysId);
	gr.addQuery('type', runsOnRelSysId);
	gr.query();
	if (gr.getRowCount() > 0)
		return;

	// No Runs on::Runs relationship.  Check for a host discovered by credentialless
	gr = new GlideRecord('cmdb_ci_computer');
	gr.addQuery('discovery_source', 'CredentiallessDiscovery');
	gr.addQuery('ip_address', ip_address);
	gr.setLimit(2);
	gr.query();
	// We only want to reconcile by IP if the match is unambiguous
	if (gr.getRowCount() == 1) {
		gr.next();
		newGr = new GlideRecord('cmdb_rel_ci');
		newGr.parent = vCenterSysId;
		newGr.type = runsOnRelSysId;
		newGr.child = gr.sys_id;
		newGr.insert();
	}
}

//////////////////////////////////////////////////////////////////////////
function updateStaleness() {

	var vmObjIds, gr;

	markStale(allFolders, 'cmdb_ci_vcenter_folder', vCenterSysId);

	markStale(allDatacenters, 'cmdb_ci_vcenter_datacenter', vCenterSysId, 'morid');
	markStale(allVms, 'cmdb_ci_vmware_template', vCenterSysId);
	markStale(allVms, 'cmdb_ci_vmware_instance', vCenterSysId);

	markStale(allDatastores, 'cmdb_ci_vcenter_datastore', vCenterSysId);
	markStale(allNetworks, 'cmdb_ci_vcenter_network', vCenterSysId);
	markStale(allNetworks, 'cmdb_ci_vcenter_dv_port_group', vCenterSysId);
	markStale(allNetworks, 'cmdb_ci_vcenter_dvs', vCenterSysId);
	markStale(allClusters, 'cmdb_ci_vcenter_cluster', vCenterSysId);

	markStale(allFolders, 'cmdb_ci_vcenter_folder', vCenterSysId);
	markStale(output.hosts, 'cmdb_ci_esx_server', vCenterSysId, 'morid');
	markStale(output.pools, 'cmdb_ci_esx_resource_pool', vCenterSysId);

	vmObjIds = allVms.map(function(vm) { return vm.morid; });

	// Mark stale VMs as 'retired'
	gr = new GlideMultipleUpdate('cmdb_ci_vmware_instance');
	gr.addQuery('vcenter_ref', vCenterSysId);
	gr.addQuery('object_id', 'NOT IN', vmObjIds);
	gr.setValue('install_status', '7');
	gr.execute();

	// VMs may need to be un-retired (usually because of VM migration).
	// We have to handle that in the VMs sensor because an event won't
	// go through this code
}

//////////////////////////////////////////////////////////////////////////
function markStale(mors, table, vcenter, morColumn) {
	var sysIds,
		map = { },
		gr = new GlideRecord(table);

	gr.addQuery('vcenter_ref', vcenter);
	gr.query();

	while (gr.next())
		map['' + gr.sys_id] = true;

	sysIds = VMUtils.lookupSysIds(mors, table, vCenterSysId, morColumn);
	sysIds.forEach(function(sysId) {
		map[sysId] = false;
	});

	SNC.DiscoveryCIReconciler.updateStaleness(JSON.stringify(map), table);
}

//////////////////////////////////////////////////////////////////////////
function fixupDatacenter(dc) {
	dc.managedBy = { sys_id: vCenterSysId };
	dc.object_id = dc.morid;
	dc.vcenter_uuid = vCenterUuid;
	dc.vcenter_ref = vCenterSysId;
}

//////////////////////////////////////////////////////////////////////////
function fixupFolder(folder) {
	folder.vcenter_ref = vCenterSysId;
	folder.vcenter_uuid = vCenterUuid;
	folder.object_id = folder.morid;
}

//////////////////////////////////////////////////////////////////////////
function processDatacenter(dc) {
	var datastores, clusters, networks, vms,
		folders = [ ],
		dcFolders = dc.folders,
		args = {
			leaveCurrent: 1,
			location: locationID,
			statusId: statusID,
			mutexPrefix: dc.morid,
			schema: folderSchema,
			results: { cmdb_ci_vcenter_folder: folders }
		};

	allHosts = allHosts.concat(dc.hosts);
	allPools = allPools.concat(dc.pools);
	allDatacenters.push(dc.morid);

	datastores = extractFoldersAndChildren(dcFolders.datastoreFolder, folders, dc);
	clusters = extractFoldersAndChildren(dcFolders.hostFolder, folders, dc);
	networks = extractFoldersAndChildren(dcFolders.networkFolder, folders, dc);
	vms = extractFoldersAndChildren(dcFolders.vmFolder, folders, dc);

	// Prepare & write the folders
	JsonCi.prepare(args);
	JsonCi.writeJsObject(args);

	allVms = allVms.concat(vms);
	allDatastores = allDatastores.concat(datastores);
	allNetworks = allNetworks.concat(networks);
	allClusters = allClusters.concat(clusters);
	allFolders = allFolders.concat(folders);

	// Trigger probes configured to run after the datacenters sensor.
	triggerProbes(dc, datastores, clusters, networks, vms);

	JsonCi.updateRelationships(args);
}

//////////////////////////////////////////////////////////////////////////
function triggerProbes(dc, stores, clusters, networks, vms) {
	var objects = {
		datastore: stores,
		cluster: clusters,
		network: networks,
		vm: vms
	},
		parms = {
			vcenter_sys_id: vCenterSysId,
			vcenter_uuid: vCenterUuid,
			datacenter_mor_id: dc.morid,
			datacenter_sys_id: dc.sys_id,
		};

	VMUtils.triggerProbes(_this, objects, parms);
}

//////////////////////////////////////////////////////////////////////////
function extractFoldersAndChildren(root, folders, dc) {
	var children = [ ];

	extractChildrenFromFolder(root, dc.name);

	root.cmdb_ci_vcenter_folder.forEach(function(c) { c.cmdb_ci_vcenter_datacenter = dc.sys_id; });
	delete root.cmdb_ci_vcenter_folder;

	return children;

	function extractChildrenFromFolder(parent, fullpath) {
		parent.cmdb_ci_vcenter_folder = [ ];
		parent.hostedOn = dc.sys_id;
		parent.childEntity.forEach(
			function(child) {
				if (child.type == 'Folder') {
					parent.cmdb_ci_vcenter_folder.push(child);
					child.fullpath = fullpath + ' | ' + child.name;
					folders.push(child);
					extractChildrenFromFolder(child, child.fullpath);
				} else if (child.type == 'VirtualApp')
					extractChildrenFromFolder(child, child.fullpath);
				else if (child.type == 'StoragePod') {
					children.push(child);
					extractChildrenFromFolder(child, child.fullpath);
				}
				else
					children.push(child);
			});
		delete parent.childEntity;
	}
}

})();

```