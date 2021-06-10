---
title: "ServiceMappingUtils"
id: "servicemappingutils"
---

API Name: global.ServiceMappingUtils

```js
var ServiceMappingUtils = Class.create();
ServiceMappingUtils.prototype = {
	initialize: function() {
	},
	
	resetModel: function(bsGr) {
		// If flag is off, services will only be removed and will not be created
		if (GlideProperties.getBoolean('sa.service_modeling.use', true))
			reset(bsGr);
	},
	
	removeFromModel: function(bsGr) {
		remove(bsGr);
	},
	
	type: 'ServiceMappingUtils'
};

var manager = new SNC.ServiceModelingIntegrationManager();

function reset(bsGr) {
	remove(bsGr);
	create(bsGr);
}

function remove(bsGr) {
	var layerId = getLayerId(bsGr);
	if (layerId != null) {
		// Here we force removal, i.e. we ignore the sa.service_modeling.use flag
		manager.forceRemoveBusinessService(bsGr);
	}
}

function create(bsGr) {
	manager.createBusinessService(bsGr);
	
	addEntryPoints(bsGr);
	addBoundaries(bsGr);
}

function addEntryPoints(bsGr) {
	var bsId = bsGr.getValue('sys_id');
	var m2mgr = new GlideRecord('sa_m2m_service_entry_point');
	m2mgr.addQuery('cmdb_ci_service',bsId);
	m2mgr.query();
	while (m2mgr.next()) {
		manager.addEntryPoint(bsId,m2mgr.getValue('cmdb_ci_endpoint'));
	}
	
	recompute(bsGr);
}

function addBoundaries(bsGr) {
	if (!pm.isActive("com.snc.service-mapping")) {
	    //debug message will appear on UI page after Session Debug > Enable All
		gs.debug("Skipping ServiceMappingUtils.addBoundaries: plugin com.snc.service-mapping is not active.");
		return;
	}
	
	var bsId = bsGr.getValue('sys_id');
	var epList = new GlideStringList();
	var m2mgr = new GlideRecord('sa_m2m_boundary_ep_service');
	m2mgr.addQuery('service',bsId);
	m2mgr.query();
	while (m2mgr.next()) {
		epList.add(m2mgr.getValue('endpoint'));
	}
	
	if (!epList.isEmpty()) {
		manager.markBoundaryEndpoints(epList, bsId, null, null);
		recompute(bsGr);
	}
}

function getLayerId(bsGr) {
	return bsGr.getValue('layer');
}

function recompute(bsGr) {
	var layerId = getLayerId(bsGr);
	var grLayer = new GlideRecord('svc_layer');
	if (grLayer.get(layerId)) {
		SNC.ServiceMappingFactory.recomputeLayer(grLayer);
	}
}
```