---
title: "DiscoveryReconciler"
id: "discoveryreconciler"
---

API Name: global.DiscoveryReconciler

```js
var DiscoveryReconciler = Class.create();
DiscoveryReconciler.prototype = {
	initialize: function(cmdbGr, data) {
		this.cmdbGr = cmdbGr;
		this.data = data;
	},

	process: function() {
		for (var tableName in this.data){
			var obj = this.data[tableName];
			if (tableName == 'cmdb_ci_spkg') {
				var cmsoft = new GlideappCMDBSoftwareHelper(this.cmdbGr);
				cmsoft.reconcile(obj.data);
			// PRB1258867: remove duplicate serial number records inserted by CMDB IRE
			} else if (tableName ==  'cmdb_serial_number') {
				this.normalRelatedListWithDeleteOption(tableName, obj.data, obj.refName, obj.keyName, true, obj.deleteGr);
			} else if (tableName == 'cmdb_ci_network_adapter') {
				this.networkAdapters(obj);
			} else
				this.normalRelatedListWithDeleteOption(tableName, obj.data, obj.refName, obj.keyName, false, obj.deleteGr);
		}
	},

	/*
	   CMDB IRE will re-insert previously absent records as installed if they are re-discovered --
	   so we need to reconcile related lists where this happens so that the originally created
	   related list record is the one marked as 'installed' and then remove the duplicate(s) inserted by the IRE
	*/
	doPostReconciliationCleanup: function(tableName, data, refName, keyName) {
		var _this = this;
		var keyFields = keyName.split(',');
		var idx, field, gr, table;
		data.forEach(function(dataRow) {
			gr = new GlideRecord(tableName);
			gr.addQuery(refName, _this.cmdbGr.getUniqueValue()+'');

			for (idx = 0; idx < keyFields.length; idx++) {
				field = keyFields[idx];
				gr.addQuery(field, dataRow[field]);
			}

			// order by sys_created_on so that the one we pick as the installed record is always the oldest
			gr.orderBy('sys_created_on');
			gr.query();

			// if there's no match or only one, there's nothing to do here ...
			if (gr.getRowCount() <= 1)
				return;

			gr.next();
			// look for 'status' or 'absent' field on gr to update
			if (gr.isValidField('install_status'))
				gr.setValue('install_status', 1); // 1 == 'installed'

			if (gr.isValidField('absent'))
				gr.setValue('absent', false);

			gr.update();

			// delete the other matching records (the duplicates created by IRE)
			while (gr.next())
				gr.deleteRecord();
		});
	},

	
	normalRelatedList: function(tableName, data, refName, keyName, cmdbReconciled) {
		this.normalRelatedListWithDeleteOption(tableName, data, refName, keyName, cmdbReconciled, false);
	},

	normalRelatedListWithDeleteOption: function(tableName, data, refName, keyName, cmdbReconciled, deleteGr) {

		if (DiscoveryReconciler.useFastReconcile) {
			this.fastReconcile(tableName, data, refName, keyName, cmdbReconciled, deleteGr);
			return;
		}

		var dReconciler = SncDiscoveryReconciler;
		if (!data)
			return;

		var tr;
		if (typeof (deleteGr) == 'undefined')
			tr = new dReconciler(tableName, refName, this.cmdbGr);
		else
			tr = new dReconciler(tableName, refName, this.cmdbGr, deleteGr);
		tr.reconcile(data, keyName);
		
		if (DiscoveryCMDBUtil.useCMDBIdentifiers() && cmdbReconciled)
			this.doPostReconciliationCleanup(tableName, data, refName, keyName);
	},

	fastReconcile: function(tableName, data, refName, keyName, cmdbReconciled, deleteGr) {
		var key, gr, item, name, lastKeyName, grCleanupData, chunk,
			_this = this,
			keyedData = { },
			keys = keyName.split(','),
			toDelete = [ ],
			grData = { };

		data.forEach(function(item) {

			// Do doPostReconciliationCleanup() inline
			// Whatever record we wind up keeping should be installed
			if (cmdbReconciled) {
				item.install_status = 1; // 1 == 'installed'
				item.absent = 'false';
			}

			key = [ ];
			keys.forEach(function(name) {
				key.push('' + item[name]);
			});
			key = key.join('***');
			keyedData[key] = item;
		});

		gr = new GlideRecord(tableName);
		gr.addQuery(refName, '' + this.cmdbGr.sys_id);
		gr.query();

		while (gr.next()) {
			key = keys.map(function(name) { return '' + gr[name]; });
			keyName = key.join('***');

			// Check for duplicate records already in the db
			grCleanupData = grData[keyName];
			if (grCleanupData) {
				if (grCleanupData.created < gr.sys_created_on) {
					// The current record is older than the previous one we found,
					// so delete the current record
					toDelete.push('' + gr.sys_id);
					continue;
				}
				// If we get here then the previously found record is newer than
				// the current record.  Delete the previously found record.
				toDelete.push('' + grCleanupData.sys_id);
			}
			// This is the record we're going to keep
			grData[keyName] = { sys_id: '' + gr.sys_id, created: gr.sys_created_on };

			item = keyedData[keyName];
			if (item) {
				// Should be in db and is in db -> update
				update(gr, item);
				keyedData[keyName] = undefined;
			} else {
				// Is in DB but should not be.  Mark for deletion.
				toDelete.push('' + gr.sys_id);
				keyedData[keyName] = undefined;
			}
		}

		gr = 0;    // Make sure the result set can be garbage collected

		// I tested this vs deleting records as we find them in the loop above.
		// When deleting 10,000 records this method to 6.5 seconds while deleting
		// in the loop took 75 seconds.
		while (toDelete.length) {
			chunk = toDelete.splice(0, 500);
			gr = new GlideRecord(tableName);
			gr.addQuery('sys_id', 'IN', chunk);
			gr.deleteMultiple();
		}

		for (name in keyedData) {
			item = keyedData[name];
			item && insertItem(item, name);       // insert this item
		}

		function insertItem(item, name) {
			var gr, name;

			gr = new GlideRecord(tableName);
			for (name in item)
				gr.setValue(name, item[name]);

			gr[refName] = '' + _this.cmdbGr.sys_id;

			gr.insert();
		}

		function update(gr, item) {
			for (var name in item)
				gr.setValue(name, item[name]);
			gr.update();
		}
	},

	networkAdapters: function(obj) {
		var adapters = obj.data;
		var fixedAdapters = [];
		var nicsByNameAndMac = {};
		var routesByName = {};
		var routerInterfaces = [];
		for (var i = 0; i < adapters.length; i++) {
			var adapter = adapters[i];
			var adapterHasName = !gs.nil(adapter.name);
			if (adapterHasName) {
				if (adapter.name.startsWith("lo") || this.isLocalhost(adapter))
					continue;
			}
			
			if (!JSUtil.nil(adapter.mac_address)) {
				var ma = SncMACAddress.getMACAddressInstance(adapter.mac_address);
				adapter.mac_address = (ma) ? ma.getAddressAsString() : '';
			}

			if (!adapterHasName) {
				if (gs.nil(adapter.ip_address) && gs.nil(adapter.mac_address))
					continue;

				adapter.name = !gs.nil(adapter.ip_address) ? 'NetworkAdapter@' + adapter.ip_address : 'NetworkAdapter@' + adapter.mac_address;
			}
			
			fixedAdapters.push(adapter);
			nicsByNameAndMac[adapter.name + '::' + adapter.mac_address] = adapter;
			routesByName[adapter.name] = adapter.routes;
			// skip router interfaces with empty name or MAC address
			if (adapter.name && adapter.mac_address)
				routerInterfaces.push({name: adapter.name, ip_address: adapter.ip_address, mac_address: adapter.mac_address});
		}
		adapters = fixedAdapters;
		this.normalRelatedList('cmdb_ci_network_adapter', adapters, obj.refName, obj.keyName, true);

		// router interfaces are reconciled by the SNMP - Routing sensor for devices with routing capability
		if (!this.canRoute())
			this.normalRelatedList('dscy_router_interface', routerInterfaces, obj.refName, obj.keyName);
		
		// handle new-style IP address reconciliation...
		var gr = new GlideRecord('cmdb_ci_network_adapter');
		gr.addQuery('cmdb_ci', this.cmdbGr.getUniqueValue());
		gr.addQuery('install_status', '!=', 100);
		gr.query();
		while (gr.next()) {
			var nic_name_and_mac = gr.name + "::" + gr.mac_address;
			var nic_sys_id = '' + gr.sys_id;
			var nic_adapter = nicsByNameAndMac[nic_name_and_mac];
			if (!nic_adapter || !nic_adapter.ip_addresses)
				continue;
			
			var rlr = new GlideRelatedListReconciler('cmdb_ci_ip_address', 'nic', nic_sys_id, null,
			null);
			rlr.reconcile(nic_adapter.ip_addresses, 'ip_address');
		}
		
		// handle route reconciliation
		// get exit interfaces
		gr = new GlideRecord('dscy_router_interface');
		gr.addQuery('cmdb_ci', this.cmdbGr.getUniqueValue());
		gr.addQuery('install_status', '!=', 100);
		gr.query();
		gr.saveLocation();

		var fixedIfRoutes = [];
		while (gr.next()) {
			// reconcile exit interface routes
			var exitIfaceRoutes = routesByName[gr.name].ifRoutes;
			for (var j = 0; j < exitIfaceRoutes.length; j++) {
				var route = exitIfaceRoutes[j];
				// no localhost routes
				if (route.dest_ip_network.indexOf('127.') == 0)
					continue;
				
				route.router_interface = gr.sys_id.toString();
				fixedIfRoutes.push(route);
			}
		}
		this.normalRelatedList('dscy_route_interface', fixedIfRoutes, obj.refName, "dest_ip_network,router_interface");

		// get exit interface routes
		var eigr = new GlideRecord('dscy_route_interface');
		eigr.addQuery('cmdb_ci', this.cmdbGr.getUniqueValue());
		eigr.addQuery('install_status', '!=', 100);
		eigr.query();
		
		var exitRoutesByIface = {};
		while (eigr.next()) {
			var iface = eigr.router_interface.getDisplayValue();
			if (! exitRoutesByIface.hasOwnProperty(iface)) {
				exitRoutesByIface[iface] = [];
			}
			if(eigr.dest_ip_network != '0.0.0.0/0') {
			var net = new SncIPNetworkV4(eigr.dest_ip_network);
			var routeInfo = {net: net, sysid: eigr.sys_id + ''};
			exitRoutesByIface[iface].push(routeInfo);
		}
		}
		
		// iterate over interfaces again now that exit interface routes have been reconciled
		// reconcile next hop routes
		gr.restoreLocation();

		var fixedRoutes = [];
		while (gr.next()) {
			if (! exitRoutesByIface.hasOwnProperty(gr.name))
				continue;
			
			var gwRoutes = routesByName[gr.name].gwRoutes;
			for (var k=0; k < gwRoutes.length; k++) {
				var gwRoute = gwRoutes[k];
				
				// no localhost routes
				if (gwRoute.dest_ip_network.indexOf('127.') == 0)
					continue;
				
				var ip = new SncIPAddressV4(gwRoute.next_hop_ip_address);
				var exitRoutes = exitRoutesByIface[gr.name];
				for (var m=0; m < exitRoutes.length; m++) {
					var exitRoute = exitRoutes[m];
					if (exitRoute.net.contains(ip) || exitRoute.net.isBroadcastAddress(ip)) {
						gwRoute.route_interface = exitRoute.sysid;
						fixedRoutes.push(gwRoute);
						break;
					}
				}
			}
		}
		this.normalRelatedList('dscy_route_next_hop', fixedRoutes, obj.refName, "dest_ip_network,route_interface");
	},
	
	isLocalhost: function(adapter) {
		if (adapter.ip_address != null && adapter.ip_address == '127.0.0.1')
			return true;
		
		if (!adapter.ip_addresses)
			return false;
		
		for (var i = 0; i < adapter.ip_addresses.length; i++) {
			if (adapter.ip_addresses[i].ip_address == '127.0.0.1')
				return true;
		}
		
		return false;
	},
	
	canRoute: function() {
		if (this.cmdbGr.sys_class_name != 'cmdb_ci_ip_router' && this.cmdbGr.sys_class_name != 'cmdb_ci_ip_switch')
			return false;

		var gru = new GlideRecordUtil();
		var rgr = gru.getCIGR(this.cmdbGr.sys_id);
		return rgr.can_route;
	},

	type: 'DiscoveryReconciler'
};
```