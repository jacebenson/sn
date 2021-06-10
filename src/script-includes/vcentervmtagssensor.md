---
title: "VCenterVMTagsSensor"
id: "vcentervmtagssensor"
---

API Name: global.VCenterVMTagsSensor

```js
/* jshint -W030 */

var VCenterVMTagsSensor;

(function() {

var vCenterSysId, vCenterUuid, datacenterMorId, datacenterSysId,
	tagSchema = {
		cmdb_key_value: {
			index: [['configuration_item', 'key', 'value']]
		}
	},
	args = {
		schema: tagSchema
	};

VCenterVMTagsSensor = {
	process: process,
    type: 'DiscoverySensor'
};

/*
Sample data:
	{
	  'cmdb_key_value': [
		{
			"morid":"vm-5260",
			"key":"Dev_lab",
			"value":"User",
			"tag":"Tags",
			"configuration_item":"69d7ee3d674c330018da6c706785ef6c"
		}
	  ]
	}
*/
//////////////////////////////////////////////////////////////////////////
function process(result) {

	var outputData, vmLookUpTableNames = ['cmdb_ci_vmware_instance', 'cmdb_ci_vmware_template'];
	var morIDs = JSON.parse(g_probe.getParameter('mor_ids') + '');
	output = JSON.parse(output);

	getProbeParms();

	args.location = this.getLocationID();
	args.statusId = new DiscoveryStatus(g_probe.getParameter('agent_correlator') + '');

	// During normal discovery g_probe_parameters should always be defined.
	// It's only undefined during test execution.
	if (typeof g_probe_parameters != 'undefined') {
		g_probe_parameters.cidata = this.getParameter('cidata');
		g_probe_parameters.source = this.getParameter('source');
	}

	this.statusID = new DiscoveryStatus(g_probe.getParameter('agent_correlator') + '');

	/*
		We have only mor ids in the output but we need respective sys_ids to persist
		the tags data into cmdb_key_value table so we retrieve the sys_id in
		persist in the key called 'configuration_item' that is added for the entries in
		"output" object

		Sample data:
			[
				{
					"morid":"vm-5260",
					"key":"Dev_lab",
					"value":"User",
					"tag":"Tags",
					"configuration_item":"371b127a6780330018da6c706785ef03"
				},
				{
					"morid":"vm-4564",
					"key":"Dev_lab",
					"value":"User : System Administrator",
					"tag":"Tags",
					"configuration_item":"331b127a6780330018da6c706785ef06"
				}
			]
	*/
	outputData = output['cmdb_key_value'];
	VMUtils.lookupSysIdsInTables(outputData, vmLookUpTableNames, vCenterSysId, 'object_id', 'configuration_item');

	output['cmdb_key_value'] = outputData;
	args.results = output;
	args.results = JsonCi.prepare(args);
	JsonCi.writeJsObject(args);

	// Fetching Sys ids for the mor ids provided to the pribe
	VMUtils.lookupSysIdsInTables(morIDs, vmLookUpTableNames, vCenterSysId, 'object_id', 'sys_id');

	// Cleaning up the existing old tags data for the VMs Mor IDs provided
	cleanUpOldTagsDataForGivenVMs(output, morIDs);
}


//////////////////////////////////////////////////////////////////////////
function getProbeParms() {
	vCenterSysId = '' + g_probe.getParameter('vcenter_sys_id');
	vCenterUuid = '' + g_probe.getParameter('vcenter_uuid');
	datacenterSysId = '' + g_probe.getParameter('datacenter_sys_id');
	datacenterMorId = '' + g_probe.getParameter('datacenter_mor_id');
}


/*
	Below is the function used to clean-up the old existing tags data for the set of
	VMs provided to the probe. "output" and  "morIDs" are the inputs passed to this.

	Inputs Sample Data is -

	output = {
				"cmdb_key_value":[
					{
						"morid":"vm-5260",
						"key":"Dev_lab",
						"value":"User",
						"tag":"Tags",
						"configuration_item":"371b127a6780330018da6c706785ef03",
						"sys_class_name":"cmdb_key_value",
						"sys_id":"4f99e3ba6700330018da6c706785eff4",
						"isClean":true,
						"gr":0
					},
					{
						"morid":"vm-4564",
						"key":"Dev_lab",
						"value":"User : System Administrator",
						"tag":"Tags",
						"configuration_item":"331b127a6780330018da6c706785ef06",
						"sys_class_name":"cmdb_key_value",
						"sys_id":"d7bc223267c0330018da6c706785ef7e",
						"gr":0,
						"isClean":true
					}
				]
			}

	morIDs = [
				{
					"type":"VirtualMachine",
					"morid":"vm-5260",
					"sys_id":"371b127a6780330018da6c706785ef03"
				},
				{
					"type":"VirtualMachine",
					"morid":"vm-4564",
					"sys_id":"331b127a6780330018da6c706785ef06"
				}
			]
*/
//////////////////////////////////////////////////////////////////////////
function cleanUpOldTagsDataForGivenVMs(output, morIDs) {
	var vCenterTagsSource = 'Tags';
	var obj = {};
	var dataMap = {};
	var updatedCMDBKeyValueRecords = output.cmdb_key_value;

	/*
		We create a map. Each vm sys_id is the key

		Sample Data for "dataMap"
		{
			"371b127a6780330018da6c706785ef03": [],
			"331b127a6780330018da6c706785ef06": [],
			"65d7ee3d674c330018da6c706785ef76": []
		}
	*/
	morIDs.forEach(function(morObj){
		if (morObj.sys_id)
			dataMap[morObj.sys_id + ''] = [];
	});

	/*
		We update the map in such a way that for each VM sys id,
		any records in cmdb_key_value table are created/updated
		if so then add all the sys_ids of the cmdb_key_value records
		in corresponding arrays.

		Updated Data for "dataMap"
		{
			"371b127a6780330018da6c706785ef03": [ 4f99e3ba6700330018da6c706785eff4 ],
			"331b127a6780330018da6c706785ef06": [ d7bc223267c0330018da6c706785ef7e ],
			"65d7ee3d674c330018da6c706785ef76": []
		}

	*/
	updatedCMDBKeyValueRecords.forEach(function(obj){
		var vmSysID = obj.configuration_item + '';
		if (dataMap.hasOwnProperty(vmSysID))
			dataMap[vmSysID].push(obj.sys_id);
	});

	for (var i in dataMap) {
		var vmSysID = i;
		var keyValueCMDBRecords = dataMap[i];

		var gr = new GlideRecord('cmdb_key_value');
		gr.addQuery('tag', vCenterTagsSource);
		gr.addQuery('configuration_item', vmSysID);
		gr.addQuery('sys_id', 'NOT IN', keyValueCMDBRecords);
		gr.deleteMultiple();
	}
}

})();

```