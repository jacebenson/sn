---
title: "StorageReconciler"
id: "storagereconciler"
---

API Name: global.StorageReconciler

```js
var StorageReconciler = Class.create();

StorageReconciler.prototype = {
    initialize: function() {},
		
	/**
	 * Searches the CMDB for the Storage Volume (LU - Logical Unit) that is exporting the specified
	 * network disk via Fibre Channel (SAN). The SAN target exports a volume to the host client. The host client
	 * (Windows, Linux) imports the volume as a SAN Disk (cmdb_ci_san_disk). Creates a relationship if match found.
	 *
	 * 
	 * @param cmdb_ci_fc_disk sys_id The disk on the Host machine that is importing the volume.
	 * @param array targetWWPNs The target world-wide-port-names to search for.
	 */	
	createFCDiskToVolumeRel: function(diskSysId, lun, targetWWPNs, initiatorWWPN) {
		// Find the fc export so we can find the volume
		var exportsGr = this.findFCExports(lun, targetWWPNs, initiatorWWPN);
						
		// Finally create the relationship
		return this._createDiskToVolumeRel(diskSysId, exportsGr);
	}, 
	
	/**
	 * Searches the CMDB for the Storage Volume (LU - Logical Unit) that is exporting the specified
	 * network disk via ISCSI (SAN). The ISCSI target exports a volume to the host client. The host client
	 * (Windows, Linux) imports the volume as a SAN Disk (cmdb_ci_iscsi_disk). Creates a relationship if match found.
	 *
	 * 
	 * @param cmdb_ci_iscsi_disk sys_id The disk on the Host machine that is importing the volume.
	 */		
	createISCSIDiskToVolumeRel: function(diskSysId, lun, targetIQN, initiatorIQN) {
		// Find the iscsi export so we can find the volume
		var exportsGr = this.findISCSIExports(targetIQN, lun, initiatorIQN);

		// Finally create the relationship			
		return this._createDiskToVolumeRel(diskSysId, exportsGr);
	},
	
	/**
	 * Find FC Exports based an array of targetWWPNs and lun
	 */
	findFCExports: function(lun, targetWWPNs, initiatorWWPNs) {

		// See if we can find exports based on the initiator
		gr = new GlideRecord('cmdb_ci_fc_export');
		gr.addQuery('initiator_wwpn', initiatorWWPNs);
		if (JSUtil.notNil(lun))
			gr.addQuery('lun', "" + lun);
		gr.query();
		if (gr.hasNext())
			return gr;

		// No exports by initiator, do it the old slow & complex way.
		// Find the controller
		var controllerSysIds = this._findControllers(targetWWPNs);
		if (controllerSysIds.length == 0) 
			throw 'Controller is empty for FC Port' + targetWWPNs.toString(); 
		
		// Find the fc exports
		var gr = new GlideRecord('cmdb_ci_fc_export');
		gr.addQuery('exported_by', controllerSysIds);
		
		// Just in case we don't have lun, maybe we get lucky and only one export otherwise we will create relationships with all, better than none.
		if (JSUtil.notNil(lun)) {
			var qc = gr.addNullQuery('lun');
			qc.addOrCondition('lun', '' + lun);
		}

		if (initiatorWWPNs instanceof Array) {
			if (initiatorWWPNs.length == 1)
				gr.addQuery("initiator_wwpn", initiatorWWPNs[0]);
			else
				gr.addQuery("initiator_wwpn", 'IN', initiatorWWPNs);
		}
		else
			gr.addQuery("initiator_wwpn", initiatorWWPNs);

		gr.query();
		if (!gr.hasNext())
			throw "FC Export not found for targetWWPNs: " + targetWWPNs + " lun: " + lun + " controllerSysIds: " + controllerSysIds.toString() + " initiatorWWPN: " + JSON.stringify(initiatorWWPNs);
			
		return gr;
	}, 
	
	/**
	 * Find ISCSI Exports based on IQN and lun
	 */
	findISCSIExports: function(targetIQN, lun, initiatorIQN) {

		// It should be OK to reconcile on either the initiator
		// or target IQN.  We've reconciled on both since Geneva but
		// we've recently encountered cases where we can't find the
		// target IQN on the storage server.

		var gr = getQuery(true);
		if (!gr.hasNext()) {
			// We couldn't find an export with the same target and initiator.  Try
			// again with just the initiator.
			gr = getQuery();
			if (!gr.hasNext())
				throw "iSCSI Export not found for target IQN: " + targetIQN + " lun: " + lun;
		}

		return gr;

		function getQuery(includeTarget) {
			var gr = new GlideRecord('cmdb_ci_iscsi_export');

			includeTarget && gr.addQuery('iqn', targetIQN);
			gr.addQuery('initiator_iqn', initiatorIQN);

			// Just in case we don't have lun, maybe we get lucky and only one export
			if (lun || (lun === 0)) {
				var qc = gr.addNullQuery('lun');
				gr.addOrCondition('lun', lun);
			}

			gr.query();

			return gr;
		}
	},

	queryFcPorts: function(wwpns) {
		// query for Fibre Channel Ports that match wwpns
		var gr = new GlideRecord('cmdb_ci_fc_port');
		gr.addQuery('wwpn', wwpns);
		gr.query();
		return gr;
	},
	
	/**
	 * Get volume sys id from storage exports
	 */	
	getVolumesFromExports: function(exportsGr) {
		var seenVolumes = {};

		while (exportsGr.next()) {
			// Make sure we have not seen same volume just in case
			var volumeSysId = ''+exportsGr.storage.sys_id;
			if (!seenVolumes[volumeSysId]) 
				seenVolumes[volumeSysId] = true;	
		}
		
		return seenVolumes;
	},

	/**
	 * Find controller sysIds from an array of targetWWPNs.
	 */ 
	_findControllers: function(targetWWPNs) {
		var portsGr = this.queryFcPorts(targetWWPNs);
		var controllerSysIds = []; 
		var portSysIds = [];

		// Get all port sysIds
		while (portsGr.next()) 
				portSysIds.push('' + portsGr.sys_id);
		
		
		// Get controllers from cmdb_rel_ci
		var df = new DiscoveryFunctions();
		var typeId = df.findCIRelationshipType("cmdb_rel_type", "Controller for::Controlled by");
		var rels = new GlideRecord("cmdb_rel_ci");
		rels.addQuery("child", portSysIds);
		rels.addQuery("type", typeId + '');		
		rels.query();
		
		while (rels.next()) {
			controllerSysIds.push('' + rels.parent);
		}
		
		return controllerSysIds;
	},

	/**
	 * Create a cmdb_rel_ci relationship between disk sys_id and volume with all values in exportsGr.
	 */
	_createDiskToVolumeRel: function(diskSysId, exportsGr) {
		// Get volumes and create relationship
		var seenVolumes = this.getVolumesFromExports(exportsGr);
		var df = new DiscoveryFunctions();
		for (var volumeSysId in seenVolumes) {
			df.createRelationshipIfNotExists(volumeSysId, diskSysId, 'Exports to::Imports from');
		}

		// See if this disk is related to a vCenter datastore_disk.  If so, create a relationship from
		// it to the volume also.
		var relCi = new GlideRecord('cmdb_rel_ci');
		relCi.addQuery('child', diskSysId);
		relCi.addQuery('parent.sys_class_name', 'cmdb_ci_vcenter_datastore_disk');
		relCi.addQuery('type', '0e8ffb1537303100dcd445cbbebe5d40');   // sys_id of "Exports to::Imports from"
		relCi.query();
		if (relCi.next()) {
			for (volumeSysId in seenVolumes)
				df.createRelationshipIfNotExists(volumeSysId, relCi.parent, 'Exports to::Imports from');
		}

		return seenVolumes;
	},	

    type: 'StorageReconciler'
};
```