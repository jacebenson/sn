---
title: "VCenterESXHostsSensor"
id: "vcenteresxhostssensor"
---

API Name: global.VCenterESXHostsSensor

```js
/* jshint -W030, -W083 */

var VCenterESXHostsSensor;

// DiscoveryCMPUtils won't be available if cloud management isn't active.  Declaring
// this ensures that we won't get an exception when we check to see if it's active.
var DiscoveryCMPUtils;

(function() {

var vCenterSysId, vCenterUuid, datacenterMorId, datacenterSysId, _this,
	enableCmpApi,
	hostname = new HostnameJS(),
	esxVmMap = { },
	hostMounts = [ ],
	serialNumbers = [ ],
	clusterDetails = [ ];
	hostmount_schema = {
		index: [ 'datastore', 'esx_server' ]
	},
	esxChildOfTables = {
		cmdb_ci_vcenter_datacenter: 'Contains::Contained by',
		cmdb_ci_esx_resource_pool: 'Defines resources for::Gets resources from',
		cmdb_ci_vmware_instance: 'Registered on::Has registered',
		cmdb_ci_vmware_template: 'Registered on::Has registered',
		cmdb_ci_vcenter_cluster: 'Members::Member of',
		cmdb_ci_vcenter_network: 'Provided by::Provides',
		cmdb_ci_vcenter_dvs: 'Provided by::Provides',
		cmdb_ci_vcenter_dv_port_group: 'Provided by::Provides',
		cmdb_ci_vcenter_datastore: 'Used by::Uses'
	},
	schema = {
		cmdb_ci_esx_server: {
			fixup: fixupEsx,
			preWriteInit : preWriteInitEsx,
			preWriteRels: preWriteEsxRels,
			index: [ esxCorrelationIdIndex, esxMorIdIndex, esxSerialIndex ],
			parentOf: {
				hostedOn: 'Hosted on::Hosts'
			},
			childOf: esxChildOfTables,
			reclassify: {
				cmdb_ci_server: [ serverCorrelationIdIndex, esxSerialIndex ]
			}
		},
		cmdb_serial_number: {
			index: [ 'cmdb_ci' ]
		}
	},
	args = {
		schema: schema
	};

VCenterESXHostsSensor = {
	process: process,
    type: "DiscoverySensor"
};

// index is an array and index.filterRecord is a non-numeric property on it
schema.cmdb_ci_esx_server.index.filterRecord = function(obj, idx, tableName) {
	return idx.every(isEmpty);

	function isEmpty(name) {
		var val = obj[name];
		return !val;
	}
};

/*
Sample data.  Truncated for brevity, so possibly inconsistent:
	{
	  "cmdb_ci_esx_server": [
		{
		  "type": "HostSystem",
		  "morid": "host-1025",
		  "name": "DC0_C14_H4",
		  "install_status": false,
		  "os_version": "VMware ESX 5.0.0 build-5.0.0.19",
		  "network": [
			"network-7",
			"dvportgroup-9"
		  ],
		  "datastore": [
			"datastore-63",
			"datastore-1177"
		  ],
		  "vm": [
			"vm-5812",
			"vm-4443"
		  ],
		  "correlation_id": "33393138-3335-5553-4537-32324e35394b",
		  "cpu_speed": 2999,
		  "model_id": "ProLiant DL380 G5",
		  "ram": 16379,
		  "cpu_count": 2,
		  "cpu_core_count": 2,
		  "manufacturer": "HP",
		  "cpu_type": "Intel(R) Xeon(R) CPU            5160  @ 3.00GHz",
		  "cpu_manufacturer": "intel",
		  "cluster": [
			"domain-c105"
		  ],
		  "disk_space": 20480
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

	output = JSON.parse(output);

	VMUtils.triggerNextPage(_this, output.leftOverMors, [ 'disable_host_storage_probe' ]);

	output.vcenter_datastore_hostmount = hostMounts;
	output.cmdb_serial_number = serialNumbers;

	args.results = output;

	JsonCi.iterate(createHostMounts, args);
	schema.vcenter_datastore_hostmount = hostmount_schema;

	JsonCi.prepare(args);
	JsonCi.writeJsObject(args);
	JsonCi.updateRelationships(args);
	enableCmpApi && DiscoveryCMPUtils.callCmpApi(args.results, vCenterUuid, datacenterMorId);

	// Trigger probes configured to run after the ESX host sensor.
	// I'm passing an object that contains the host list twice.  The member
	// names in this object are used to construct the parameter name for
	// parallel probes.  In Jakarta the parameter name for the Host Storage probe
	// was 'parallel_storage_probes', so I have to have a member named 'storage'
	// to support it.  I don't want other conditional scripts to have to refer
	// to 'storage', so I'm passing the list as 'host' also.
	VMUtils.triggerProbes(_this, {
		storage: output.cmdb_ci_esx_server,
		host: output.cmdb_ci_esx_server,
		clusters: clusterDetails
	});

	fixVirtualizes();
	
	//update discovery_cloud_results if CMP plugin is not activated. The count gets added in other hook if cmp plugin is activated.
	if (!enableCmpApi)
		new CloudResourceDiscoveryCountHandler().saveCloudResourceCount(this.getAgentCorrelator(), 'cmdb_ci_esx_server', args.results.cmdb_ci_esx_server.length);
}

//////////////////////////////////////////////////////////////////////////
/*
   We try to create the Virtualized by::Virtualizes relationship between guest and
   ESX in 3 places: here, in the VMs sensor and in a business rule that runs when
   the guest is discovered.  The business rule only runs when the serial number
   has changed and the VMs sensor code only runs when the guest is unreconciled,
   making both those paths unreliable, even on re-discovery.  This code will always
   run, guaranteeing that the relationship will be created (although it may take
   two runs of ESX host discovery.)
*/
function fixVirtualizes() {
	var esx, vms;
	for (esx in esxVmMap) {
		vms = esxVmMap[esx];
		vms.forEach(
			function(vm) {
				var rel = new GlideRecord('cmdb_rel_ci');
				rel.addQuery('type', g_disco_functions.findCIRelationshipType('Instantiates::Instantiated by'));
				rel.addQuery('child', vm);
				rel.query();
				if (rel.next())
					g_disco_functions.createRelationshipIfNotExists(rel.parent, esx, 'Virtualized by::Virtualizes');
		});
	}
}

//////////////////////////////////////////////////////////////////////////
function createHostMounts(esx) {
	esx.cmdb_ci_vcenter_datastore = VMUtils.lookupSysIds(esx.datastore, 'cmdb_ci_vcenter_datastore', vCenterSysId);
	esx.cmdb_ci_vcenter_datastore.forEach(
		function(ds) {
			var hm = {
				datastore: ds,
				esx_server: esx,
				vcenter_ref: vCenterSysId
			};

			hostMounts.push(hm);
		});
}

//////////////////////////////////////////////////////////////////////////
function fixupEsx(esx) {
	var mm, cluster;

	esx.name = hostname.format(esx.name);
	esx.dns_domain = hostname.getDomainName();

	esx.vcenter_ref = vCenterSysId;
	esx.vcenter_uuid = vCenterUuid;
	
	esx.os = 'ESX';

	// Save the manufacturer for use in function esxCorrelationIdIndex below
	esx.manufacturerString = (esx.manufacturer || '').toLowerCase();
	mm = MakeAndModelJS.fromNames(esx.manufacturer, esx.model_id, 'hardware');
	esx.manufacturer = '' + mm.getManufacturerSysID();
	esx.model_id = '' + mm.getModelNameSysID();
	
	mm = MakeAndModelJS.fromNames(esx.cpu_manufacturer, null);
	esx.cpu_manufacturer = '' + mm.getManufacturerSysID();

	esx.object_id = esx.morid;

	var serialNumber = {
		cmdb_ci: esx,
		serial_number: esx.serial_number,
		serial_number_type: 'chassis',
		valid: SncSerialNumber().isValid(esx.serial_number)
	};
	serialNumbers.push(serialNumber);
	
	//traverse through the esx list and fetch only the unique cluster IDs to trigger DRS probe
	if (esx.cluster.length > 0) {
		var clusterMorId = ''+esx.cluster[0];
		var matchedIndex = clusterDetails.map(function(e) { return e.morid; }).indexOf(clusterMorId);
		if (matchedIndex == -1) {						
			var clusterDetail = {};
			clusterDetail.type = "ClusterComputeResource";
			clusterDetail.morid = clusterMorId;

			clusterDetails.push(clusterDetail);
		}						
	}
}

// Compatibility list extracted from https://www.vmware.com/resources/compatibility/search.php
// with
// mfrs = []; document.querySelectorAll('#partner option').forEach(function(el) { mfrs.push(el.title); }); mfrs.shift(); console.log(JSON.stringify(mfrs.map(name => name.toLowerCase())));
compatibleManufacturers = ["a10 networks","aberdeen llc","ace computers","acer inc.","acma computers","action","adlink technology inc.","advantech corporation","aic inc.","alcatel-lucent","amax information technologies","amd (advanced micro devices, inc.)","anders & rodewyk gmbh","aparna systems","apple","aquarius","argus computersysteme gmbh","asa computers","asem spa","asrock rack incorporation","asustek computer","avaya","bgm","bluechip computer ag","boston limited","bull s.a.s","bytespeed","cache technologies","celestica","ciara - vxtech","cisco","clearcube","coastline micro inc","colfax international","columbus micro systems inc","compusys","computer haug gmbh","coreto aktiengesellschaft","cpi computer handels gmbh","crystal group inc","cubic transportation systems","cyclone","daktech computers","dam sistemi s.r.i","data net","dell","dell emc","delphin data edv dienstleisungs gmbh","depo electronics","digital henge","diversified technology, inc","e4 computer engineering s.p.a.","egenera","electro sales corporation","emerson network power embedded computing","engitech s.a.","equus computer systems","ericsson ab","everfit computers","evesham technologies","extra computer","extreme engineering solutions, inc","exus-data gmbh","fiberhome telecommunication technologies co.,ltd","flex ltd.","forcom technology","format sp. z.o.o.","fujitsu","fujitsu siemens computers","fxt servers","gateway","gemm informatica sri","general dynamics c4s","general micro systems","giga-byte technology co., ltd.","gigabyte distribuzione spa","gigabyte srl","grande vitesse systems","hcl","helios business computer","hewlett packard enterprise","hitachi","includes hitachi data systems","hp","huawei technologies co., ltd.","ibm","ico","inbox","informatica el corte ingles ","insight technology,inc.","insite technology ltd","inspur","intel","inventec corp","investronica","ipex itg","itautec s.a.","j&n computer services","klas telecom","kontron","kraftway","leadman","lenovo","leo computer","linear systems","liquid computing","lynx it-systems gmbh","maguay","majestic computer technology","marketstar","maxdata gmbh","maxta","mazda technologies","mds micro","mildef ab","mitsubishi","mjp computers","moxa inc.","mpc","nanobay","nec","nec sas","neogenesys s.a. de c.v.","netapp","netinlink","netweb technologies","new h3c technologies co.,ltd","nfina technologies, inc.","nihon unisys","nokia solutions and networks (nsn)","nor-tech","ntt","ntt system s.a.","nutanix","nx","ocean office automation pty ltd","oceus networks","ockam","open storage solutions","optimus sa","oracle","oracle america, inc (formerly sun microsystems, inc)","pc factory sa","pinnacle data systems","pivot3","plat'home","pogo linux","powerleader","primeline solutions gmbh","pro sys srl","proconsult data a/s","promise technology, inc.","quanmax ag","quanta computer inc","quintalog systemhaus gmbh","r-style","racktop systems, llc","radisys","real.com-94 bt.","riverbed technology","rm education plc","rombus international gmbh","s.c. syneto s.r.l.","sai infosystem (india) limited","samsung","sanblaze technology","seachange international","seneca data","sgi","sia atea","siemens ag","silicon mechanics","silicon systems","simplivity corporation","snc","snc bilgisayar a.s.","sonex technologies","springpath","starline computer gmbh","stratus technologies","sugon","supermicro computer inc","svet computers","tarox systems & services gmbh","teratec","themis computer","third wave corporation","thomas-krenn.ag","toshiba solutions corporation","transtec","tsinghua tongfang co., ltd","tyan computer","unisys corporation","usa computers","vahal","verari systems","viglen limited","viper technology","vist spb","vmware","winchester systems, inc","winfirst","wipro limited","wistron corporation","wiwynn corp","wortmann ag","xenon systems pty ltd","yang ming international corp.","zao kraftway","znyx networks, inc.","zt group","zte corporation"];

// ESX host UUIDs may not be unique (see https://kb.vmware.com/s/article/1006250)
//////////////////////////////////////////////////////////////////////////
function esxCorrelationIdIndex(gr, obj, addQuery) {

	if (!addQuery('correlation_id'))
		return;

	// For possibly non-compatible hardware we want to add the mor_id to the index.
	if (!compatibleManufacturers.some(isCompatible) && !(addQuery('morid') && addQuery('vcenter_uuid')))
		return;

	gr.setLimit(1);
	gr.query();

	return gr.next();

	function isCompatible(mfr) { return obj.manufacturerString.indexOf(mfr) != -1; }
}
	
//////////////////////////////////////////////////////////////////////////
 function esxSerialIndex(gr, obj, addQuery) {
	gr.addNullQuery('correlation_id');
	if (!addQuery('serial_number'))
		return;
	gr.setLimit(1);
	gr.query();

	return gr.next();
 }

//////////////////////////////////////////////////////////////////////////
function esxMorIdIndex(gr, obj, addQuery) {
	gr.addNullQuery('correlation_id');
	if (!addQuery('morid') || !addQuery('vcenter_uuid'))
		return;

	gr.setLimit(1);
	gr.query();

	return gr.next();
 }

//////////////////////////////////////////////////////////////////////////
function serverCorrelationIdIndex(gr, obj, addQuery) {
	if (!addQuery('correlation_id'))
		return;

	gr.addQuery('sys_class_name', 'cmdb_ci_server');
	gr.setLimit(2);
	gr.query();

	if (gr.getRowCount() > 1) {
		gr.next();
		new DiscoveryLogger.warn([ 'Reclassifying server "', gr.name,'" to ESX server.  Click [code]<a href="./nav_to.do?uri=cmdb_ci_server_list.do?sysparm_query=correlation_id=',gr.correlation_id,'^sys_id!=',gr.sys_id,'" target="_blank">here</a>[code] to view the non-reclassified server records.'].join(''), 'Discovery', 'VCenterESXHostsSensor');
		return gr;
	}

	return gr.next();
 }

//////////////////////////////////////////////////////////////////////////
function preWriteInitEsx(esx, esxGr) {
	// If the esx server is migrating between vcenters, then remove relationships
	// to things that aren't in the same vcenter as the esx.
	if (esxGr.vcenter_ref &&
		esx.sys_id &&
		(esx.vcenter_ref != esxGr.vcenter_ref)) {
		var relCi = new GlideRecord('cmdb_rel_ci');
		relCi.addQuery('child.sys_id', esx.sys_id);
		relCi.addQuery('parent.sys_class_name', 'IN', Object.keys(esxChildOfTables));
		relCi.addQuery('parent.vcenter_ref', esxGr.vcenter_ref);
		relCi.deleteMultiple();
	}
}

//////////////////////////////////////////////////////////////////////////
function preWriteEsxRels(esx) {
	esx.cmdb_ci_vcenter_network = VMUtils.lookupSysIds(esx.network, 'cmdb_ci_vcenter_network', vCenterSysId);
	esx.cmdb_ci_vcenter_dv_port_group = VMUtils.lookupSysIds(esx.network, 'cmdb_ci_vcenter_dv_port_group', vCenterSysId);
	esx.cmdb_ci_vcenter_dvs = VMUtils.lookupSysIds(esx.cmdb_ci_vcenter_dvs, 'cmdb_ci_vcenter_dvs', vCenterSysId);
	esx.cmdb_ci_vmware_instance = VMUtils.lookupSysIds(esx.vm, 'cmdb_ci_vmware_instance', vCenterSysId);
	esx.cmdb_ci_vmware_template = VMUtils.lookupSysIds(esx.vm, 'cmdb_ci_vmware_template', vCenterSysId);
	cluster = VMUtils.lookupSysIds(esx.cluster, 'cmdb_ci_vcenter_cluster', vCenterSysId);

	esxVmMap[esx.sys_id] = esx.cmdb_ci_vmware_instance;

	if (DiscoveryCMPUtils.isCmpActive())
		esx.hostedOn = datacenterSysId;

	if (!cluster) {
		esx.cmdb_ci_vcenter_datacenter = datacenterSysId;

		gr = new GlideRecord('cmdb_ci_esx_resource_pool');
		gr.addQuery('vcenter_ref', vCenterSysId);
		gr.addQuery('owner_morid', esx.cluster[0]);
		gr.query();
		if (gr.next())
			esx.cmdb_ci_esx_resource_pool = '' + gr.sys_id;
	}
	esx.cmdb_ci_vcenter_cluster = cluster;
}

//////////////////////////////////////////////////////////////////////////
function getProbeParms() {
	vCenterSysId = '' + g_probe.getParameter('vcenter_sys_id');
	vCenterUuid = '' + g_probe.getParameter('vcenter_uuid');
	datacenterSysId = '' + g_probe.getParameter('datacenter_sys_id');
	datacenterMorId = '' + g_probe.getParameter('datacenter_mor_id');
	enableCmpApi = DiscoveryCMPUtils.isCmpActive() && (('' + g_probe.getParameter('enable_cmp_qa')) == 'true');
}

})();

```