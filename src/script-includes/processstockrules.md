---
title: "ProcessStockRules"
id: "processstockrules"
---

API Name: global.ProcessStockRules

```js
var ProcessStockRules = Class.create();
ProcessStockRules.prototype = Object.extendsObject(global.AssetManagementPerGlideRecordBaseJob, {
	CONS_MODEL: 'cmdb_consumable_product_model',
	TRACK_CONS: 'track_as_consumable',
	initialize: function() {
		this.transfer = new StockRuleTransfer();
	},
	getRecords: function() {
		var stockRules = new GlideRecord('alm_stock_rule');
		stockRules.addQuery('active', 'true');
		stockRules.orderBy('restocking_option');
		stockRules.query();
		return stockRules;
	},
	runJobForRecord: function(stockRuleGr) {
		if (stockRuleGr.getValue('restocking_option') === 'stockroom') {
			this._processStockoomStockrule(stockRuleGr);
		} else {
			this._processVendorStockrule(stockRuleGr);
		}
	},
	_processStockoomStockrule: function(stockRuleGr) {
		var parent = stockRuleGr.parent_stockroom;
		var stockroom = stockRuleGr.stockroom;
		var model = stockRuleGr.model;
		var supply = this.transfer.getTotalRecordCount(stockroom, model);
		var thresh = parseInt(stockRuleGr.threshold, 10);
		var need = thresh - supply;
		var order = 0;
		var size = parseInt(stockRuleGr.order_size, 10);
		if (need > 0) {
			if (size <= 0) {
				order = need;
			} else {
				while (order < need) {
					order += size;
				}
			}
			var stock = this.transfer.checkStockroomTransferAvailability(parent, model);
			if (stock >= order) {
				if (model.sys_class_name.toString() === this.CONS_MODEL
					|| model.asset_tracking_strategy.toString() === this.TRACK_CONS) {
					this.transfer.consumableTransfer(parent, stockroom, model, order);
				} else {
					this.transfer.assetTransfer(parent, stockroom, model, order);
				}
			}
			// if it does not have enough, it will run each night until the parent stockroom has enough supply
		}
	},
	_processVendorStockrule: function(stockRuleGr) {
		/*
		If quantity is below threshold and pending_delivery is false, send email & create task/purchaseOrder
		If quantity is below threshold and pending_delivery is true, do nothing
		If quantity is above threshold and pending_delivery is false, do nothing
		If quantity is above threshold and pending_delivery is true, change pending_delivery to false
		*/
		var threshold = stockRuleGr.threshold;
		var stockroom = stockRuleGr.stockroom;
		var model = stockRuleGr.model;
		var quantity = this.transfer.getTotalRecordCount(stockroom, model);
		var size = parseInt(stockRuleGr.order_size, 10);
		// Quantity below threshold
		if ((quantity < threshold) && stockRuleGr.pending_delivery.toString() !== 'true') {
			var need = threshold - quantity;
			var order = 0;
			if (size <= 0) {
				order = need;
			} else {
				while (order < need) {
					order += size;
				}
			}
			// Trigger event
			gs.eventQueue('asset.restock', stockRuleGr, order, threshold);
			if (GlidePluginManager.isActive('com.sn_hamp')) {
				sn_hamp.StockOrderUtils.createStockOrderReq(stockRuleGr, quantity, order);
			} else {
				this._createPurchaseOrder(stockRuleGr, quantity, order);
			}
			// Set "pending_delivery" to true
			stockRuleGr.pending_delivery = 'true';
		} else if ((quantity > threshold) && stockRuleGr.pending_delivery.toString() === 'true') {
			// Quantity above threshold
			stockRuleGr.pending_delivery = 'false';
		}
		stockRuleGr.update();
	},
	_createPurchaseOrder: function(stockLevel, quantity, order) {
		var stockroom = stockLevel.stockroom;
		var model = stockLevel.model;
		var threshold = stockLevel.threshold;
		// Add Task
		// we keep adding task because:
		// if procurement plugin is not enabled, then we create TASK for existing Stock Rule records
		// if procurement plugin is enabled, then we create TASK for the user who have been used to TASK
		var task = new GlideRecord('task');
		task.initialize();
		task.assigned_to = stockroom.manager;
		task.short_description = 'Quantity threshold breached: ' + stockroom.name;
		task.description = 'Stockroom: ' + stockroom.name + '\nItem: ' + model.display_name + '\nQuantity: '
			+ quantity + '\nThreshold: ' + threshold;
		task.insert();
		if (GlidePluginManager.isActive('com.snc.procurement')) {
			// Add Purchase Order
			var po = new GlideRecord('proc_po');
			po.initialize();
			po.ship_to = stockroom;
			po.short_description = 'Quantity threshold breached: ' + stockroom.name;
			po.description = '-- Created by Stock Rule --\nStockroom: ' + stockroom.name + '\nItem: '
				+ model.display_name + '\nQuantity: ' + quantity + '\nThreshold: ' + threshold;
			var poId = po.insert();
			// Add Purcahse Order Line Item
			var poli = new GlideRecord('proc_po_item');
			poli.initialize();
			poli.purchase_order = poId;
			poli.model = model;
			poli.list_price = model.cost;
			poli.cost = model.cost;
			poli.ordered_quantity = order;
			poli.total_cost = order * model.cost;
			poli.insert();
		}
	},
	getRefQualCondition: function(stockRuleGr) {
		/*
		 * Description: Used as RefQual for model and stockroom list in Stock Rule when domain separation is enabled
		 */
		if (this.fIsDomainDataSeparationEnabled) {
			return stockRuleGr.getValue('sys_domain') === 'global' ? 'sys_domain=global' : 'sys_domain='
				+ stockRuleGr.sys_domain + '^ORsys_domain=global';
		}
		return '';
	},
	type: 'ProcessStockRules',
});
```