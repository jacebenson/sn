---
title: "DiffAuditAjax"
id: "diffauditajax"
---

API Name: global.DiffAuditAjax

```js
/*
 * This Ajax script was deprecated and it's not in use.
 * The record kept for backward compatibility reasons on existing customer instances.
 * If you want to use this Ajax, consider using 
 * REST API /api/now/tracked_config_files/diff_audit instead.
 */
var DiffAuditAjax = Class.create();
DiffAuditAjax.prototype = Object.extendsObject(DiffAjax, {
	
    getTemplate: function(html, left, right){
        var jr = new GlideJellyRunner();
        jr.setEscaping(false);
        jr.setVariable("jvar_table", html);
        jr.setVariable("jvar_left", left);
        jr.setVariable("jvar_right", right);
        return jr.runFromTemplate("diff_html_viewer.xml");
    },


	ajaxFunction_diffAudit: function () {
		this.compressed_header = "COMPRESSEDDATA:";
		var diffHelper = new DiffHelper();
		var differ = new Differ();
		
		var sysId = this.getParameter("sysparm_sys_id");
		var tableName = this.getParameter("sysparm_table");
		var oldValueCaption = this.getParameter("sysparm_old_value_caption");
		var newValueCaption = this.getParameter("sysparm_new_value_caption");
		var oldValueField   = this.getParameter("sysparm_old_value_field");
		var newValueField   = this.getParameter("sysparm_new_value_field");

		var gr = new GlideRecord(tableName + '');
		if (!gr.isValid()) {
			gs.logWarning("Invalid table name: " + tableName, "DiffAuditAjax.ajaxFunction_diffAudit");
			return;
		}
		if (!gr.isValidField(oldValueField + '')) {
			gs.logWarning("The table " + tableName + " does not contain field " + oldValueField, "DiffAuditAjax.ajaxFunction_diffAudit");
			return;			
		}

		if (!gr.isValidField(newValueField + '')) {
			gs.logWarning("The table " + tableName + " does not contain field " + newValueField, "DiffAuditAjax.ajaxFunction_diffAudit");
			return;			
		}
		
		if (gr.get(sysId + '')) {
			if (!gr.canRead()) {
				gs.logWarning("Security restricted: cannot read", "DiffAuditAjax.ajaxFunction_diffAudit");
				return;
			}
			var oldValue = this._getRealValue(gr.getValue(oldValueField + ''));
			var newValue = this._getRealValue(gr.getValue(newValueField + ''));
			if (JSUtil.nil(oldValue))
				oldValue = ' ';
			if (JSUtil.nil(newValue))
				newValue = ' ';

			var d = differ.diff(oldValue, newValue, '', true);
			var html = this.getTemplate(d, oldValueCaption, newValueCaption);
			return html;
			
		}else {
			gs.logWarning("Record not found", "DiffAuditAjax.ajaxFunction_diffAudit");
			return;
			
		}
			
	},
	
	_getRealValue: function(value) {
		if (this._isCompressed(value))
			return this._decompress(value);
	
		return value;
	},
	
	_decompress: function(value) {
		var encoded = value.substring(this.compressed_header.length, value.length);
		var cs = GlideStringUtil.base64DecodeAsBytes(encoded);
		return String(GlideCompressionUtil.expandToString(cs));
	},

	_isCompressed: function(value) {
		if (GlideStringUtil.nil(value))
			return false;

		// sanity check one: does it start with compressed header
		if (!value.startsWith(this.compressed_header))
			return false;

		// sanity check two: do the first 64 characters look like base64?
		if (value.length < this.compressed_header.length + 64)
			return true; // trust it in this case

		var nibble = value.substring(this.compressed_header.length, 64);
		return GlideStringUtil.isBase64(nibble);
	}
});
```