---
title: "IDSensorUtil"
id: "idsensorutil"
---

API Name: global.IDSensorUtil

```js
// Discovery class

/**
 * Parses the output of ifconfig.
 */
var IDSensorUtil = Class.create();

IDSensorUtil.prototype = {
    getAdapters: function(output, skipStr, partsExpr, ipv4Expr, ipv6Expr, macAddressFunc) {
        var adapters = {};
        partsExpr.lastIndex = 0;
        var parts;

        while ((parts = partsExpr.exec(output)) !== null) {
            var adapterName = parts[1].split(":")[0];
            var adapterOpts = parts[2];

            if (JSUtil.notNil(skipStr) && adapterOpts.match(skipStr))
                continue;

            // See if we already have the NIC - if not, we'll create one when we have an IP address to
            // associate with it
            var adapter = adapters[adapterName];

            // Get the IPV4 address info
            ipv4Expr.lastIndex = 0;
            while ((networkInfo = ipv4Expr.exec(adapterOpts)) != null) {
                if (!SncIPAddressV4.get(networkInfo[1]) || networkInfo[1] == "0.0.0.0" ||
                    networkInfo[1] == "255.255.255.255" || networkInfo[1] == "127.0.0.1")
                    continue;

                if (!adapter) {
                    adapter = this.createAdapter(adapterName, macAddressFunc(parts[0].replace(/\n\n/mg, "\n").replace(/\n\s+/mg, " "), adapterName, networkInfo[1]));
                    adapters[adapterName] = adapter;
                }

                var netmask = networkInfo[2];
                if (!isNaN(netmask))
                    // convert cidr prefix to decimal dotted format
                    netmask = this.cidrToMask(netmask);

                this.addIP(adapter, networkInfo[1], 4, netmask);
            }

            // Get IPV6 addresses
            if (JSUtil.notNil(ipv6Expr)) {
                ipv6Expr.lastIndex = 0;
                while ((ipv6Info = ipv6Expr.exec(adapterOpts)) != null) {
                    var ipv6 = SncIPAddressV6.get(ipv6Info[1]);
                    if (!ipv6 || ipv6.isLocalhost() || ipv6.isUnspecified())
                        continue;
                    if (!adapter) {
                        adapter = this.createAdapter(adapterName, macAddressFunc(parts[0].replace(/\n\n/mg, "\n").replace(/\n\s+/mg, " "), adapterName, ipv6Info[1]));
                        adapters[adapterName] = adapter;
                    }
                    this.addIP(adapter, ipv6Info[1], 6, ipv6Info[2]);
                }
            }

            // Finished fetching IP addresses - if we have one, set the adapter values to the first ones in the list
            if (adapter) {
                adapter.ip_address = (adapter.ip_addresses.length > 0) ? adapter.ip_addresses[0].ip_address : null;
                adapter.netmask = (adapter.ip_addresses.length > 0) ? adapter.ip_addresses[0].netmask : null;
            }
        }

        var adapterList = [];
        for (var nicName in adapters)
            adapterList.push(adapters[nicName]);
        return adapterList;
    },

    getAdapterGateways: function(output, adapters, gwExpr) {
        var default_gateway;
        gwExpr.lastIndex = 0;
        var parts;

        while ((parts = gwExpr.exec(output)) !== null) {
            for (var n in adapters) {
                if (adapters[n].name == parts[2]) {
                    adapters[n].ip_default_gateway = parts[1];
                    default_gateway = parts[1];
                }
            }
        }
        return default_gateway;
    },

    getAdapterRoutes: function(output, adapters) {
        var routeExpr = /^([0-9]\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(?:\S+\s+){3}(\S+)$/gm;
        // e.g.
        // Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
        // 0.0.0.0         10.4.15.1       0.0.0.0         UG    0      0        0 eth0
        // 10.4.15.0       0.0.0.0         255.255.255.192 U     0      0        0 eth0
        // ...

        var parts;
        routeExpr.lastIndex = 0;
        while ((parts = routeExpr.exec(output)) !== null) {
            var destination = parts[1];
            var netmask = parts[3];
            var flags = parts[4];
            var ifName = parts[5];
            if (IPCollectionUtil.isPrivateIPAddress(destination)) {
                for (var n in adapters) {
                    if (ifName != adapters[n].name)
                        continue;

                    if (!adapters[n].hasOwnProperty('routes'))
                        adapters[n].routes = {
                            ifRoutes: [],
                            gwRoutes: []
                        };

                    var route = {
                        dest_ip_network: destination + '/' + this.maskToCidr(netmask)
                    };
                    if (flags.indexOf('G') == -1) {
                        route.router_interface = ifName;
                        adapters[n].routes.ifRoutes.push(route);
                    } else {
                        route.next_hop_ip_address = parts[2];
                        route.route_interface = ifName;
                        adapters[n].routes.gwRoutes.push(route);
                    }
                    break;
                }
            }
        }
    },
	
    getAdapterRoutesIproute: function(output, adapters) {
        var routeExpr = /^(\S+)\s+(?:via\s+(\S+)\s+){0,1}(?:dev\s+(\S+))/gm;
        var parts;
        routeExpr.lastIndex = 0;
        while ((parts = routeExpr.exec(output)) !== null) {
            var destination = parts[1];
            var netmask;
            var gateway = parts[2];
            var ifName = parts[3];
			
            if (destination === 'default') {
                destination = '0.0.0.0';
                netmask = '0';
            } else if (destination.indexOf("/") != -1) {
                var split = destination.split("/");
                destination = split[0];
                netmask = split[1];
            } else
                netmask = '32';
			
            if (IPCollectionUtil.isPrivateIPAddress(destination)) {
                for (var n in adapters) {
                    if (ifName != adapters[n].name)
                        continue;

                    if (!adapters[n].hasOwnProperty('routes'))
                        adapters[n].routes = {
                            ifRoutes: [],
                            gwRoutes: []
                        };

                    var route = {
                        dest_ip_network: destination + '/' + netmask
                    };
                    if (gateway) {
                        route.next_hop_ip_address = gateway;
                        route.route_interface = ifName;
                        adapters[n].routes.gwRoutes.push(route);
                    } else {
                        route.router_interface = ifName;
                        adapters[n].routes.ifRoutes.push(route);
                    }
                    break;
                }
            }
        }	
    },

    // Takes a netmask (e.g. '255.255.255.255') and returns the cidr representation (e.g. '32')
    maskToCidr: function(mask) {
        var cidr = 0;
        var parts = mask.split('.');
        for (var i = 0; i < parts.length; i++) {
            part = Number(parts[i]);
            while (0x80 == (part & 0x80)) {
                ++cidr;
                part = part << 1 & 0xff;
            }
        }
        return (String(cidr));
    },
	
    cidrToMask: function(cidr) {
        if (isNaN(cidr))
            return null;
			
        var cidrInt = parseInt(cidr);
        if (cidrInt < 0 || cidrInt > 32)
            return null;
		
        var div = Math.floor(cidrInt / 8);
        var rem = cidrInt % 8;
        var res = [0, 0, 0, 0];
        var i = 0;
        for ( ; i < div; i++)
            res[i] = 255;
		
        if (i < 4)
            res[i] = 256 - Math.pow(2, 8 - rem);
		
        return res.join('.');
    },
	
	addIP: function(adapter, address, version, netmask) {
		if (!adapter)
			return;
		
		var ip = {};
		ip.ip_address = address;
		ip.ip_version = version;
		ip.netmask = netmask;
		adapter.ip_addresses.push(ip);
	},
	
	createAdapter: function(name, macAddress) {
		var adapter = {};
		adapter.name = name;
		adapter.mac_address = macAddress;
		adapter.ip_addresses = [];
			return adapter;
		},

	/*
	 * Get a serial number from an SNMP probe result based on the given OID.
	 * Optionally fallback to another value if the value from probe result is null.
	 * The identityString arg was previously used for a debug logging but is currently ignored.
	 */
	calculateSnmpSerialNumber: function(result, serialNumberOid, fallbackValue, identityString) {
		var snmp = new SNMPResponse(result);
		var snValue = snmp.getOIDText(serialNumberOid);

		if (JSUtil.notNil(snValue))
			return snValue;

		if (JSUtil.notNil(fallbackValue))
			return fallbackValue;

		return null;
	},

	/*
	 * Validates and adds a serial number to a CI
	 * By default the serial number added will by of type 'chassis'
	 */
	addToSerialNumberTable: function(serialNumber, ciData) {
		var snm = new SerialNumberManager();
		if (JSUtil.notNil(serialNumber))
			snm.add('chassis', serialNumber);
	
		var srlArr = snm.getSerialsForCIData();
		if (JSUtil.notNil(srlArr))
			ciData.getData()['serial_number'] = snm.getSerialNumber();	

		var rl = new CIRelatedList('cmdb_serial_number', 'cmdb_ci');
		for (var i = 0; i < srlArr.length; i++) {
			if (srlArr[i].valid)
				rl.addRec(srlArr[i]);
		}
		ciData.addRelatedList(rl);
	},
	
	type: "IDSensorUtil"
};
```