---
title: "ChangeCommon"
id: "changecommon"
---

API Name: global.ChangeCommon

```js
var ChangeCommon = Class.create();

ChangeCommon.LOG_PROPERTY = "com.snc.change_management.core.log";
ChangeCommon.MATCH_ALL_PROPERTY = "com.snc.change_management.process.match.all";

ChangeCommon.prototype = {
	initialize: function() {
	},
	type: "ChangeCommon"
};

ChangeCommon.DATE_ELEMENT_TYPE = {
	"glide_date_time": true,
	"glide_date": true,
	"due_date": true,
	"date": true,
	"datetime": true
};

ChangeCommon.assign = function(target, varArgs) {
	if (target == null)
		throw new TypeError("Cannot convert undefined or null to object");

	var to = Object(target);

	for (var index = 1; index < arguments.length; index++) {
		var nextSource = arguments[index];

		if (nextSource != null)
			for (var nextKey in nextSource)
				if (Object.prototype.hasOwnProperty.call(nextSource, nextKey))
					to[nextKey] = nextSource[nextKey];
	}
	return to;
};

ChangeCommon.matchAll = function() {
	return gs.getProperty(ChangeCommon.MATCH_ALL_PROPERTY, "true") + "" !== "true" ? "IR_AND_OR_QUERY" : "IR_AND_QUERY";
};

ChangeCommon.toJS = function(_gr, excludes) {
	var obj = {};

	if (!_gr || typeof _gr === "undefined" || !_gr.canRead())
		return obj;

	excludes = excludes || {
		sys_scope: true,
		sys_replace_on_upgrade: true,
		sys_policy: true,
		sys_package: true,
		sys_customer_update: true,
		sys_update_name: true,
		sys_mod_count: true
	};

	var elements = _gr.getElements();
	var jsArr = Array.isArray(elements);

	// Scoped vs Global calls to getElements returns different objects
	var elementsLength = jsArr ? elements.length : elements.size();
	for (var i = 0; i < elementsLength; i++) {
		var element = jsArr ? elements[i] : elements.get(i);
		var elementName = element.getName() + "";
		if (!element.canRead() || !elementName || excludes[elementName])
			continue;

		var fieldType = element.getED().getInternalType() + "";
		var fieldValue = element.toString();
		if (fieldType === "boolean")
			fieldValue = fieldValue === "true" ? true : false;
		else if (fieldType === "integer" || fieldType === "decimal")
			fieldValue = !fieldValue ? fieldValue : fieldValue - 0;

		obj[elementName] = {
			"display_value": element.getDisplayValue(),
			"value": fieldValue
		};

		// Augment object for date types
		if (ChangeCommon.DATE_ELEMENT_TYPE[fieldType]) {
			var gdt = new GlideDateTime();
			gdt.setValue(element.toString());
			obj[elementName].display_value_internal = gdt.getDisplayValueInternal();
		}
	}

	if (this._log.atLevel(GSLog.DEBUG))
		this._log.debug("[_toJS] return: " + JSON.stringify(obj));

	return obj;
};

/**
*  Get a subset of the records supplied
*  limit  : Maximum record size to be returned
*  offset : Starting point of the return records
*
*  Returns array of JS'd GlideRecords
*/
ChangeCommon.getWindow = function(_gr, limit, offset) {
	var obj = [];

	if (!_gr || typeof _gr === "undefined")
		return obj;

	if (!offset || offset < 0)
		offset = 0;
	if (!limit || limit < 0)
		limit = 500;

	var currentOffset = 0;
	while (_gr.next() && limit > 0) {
		currentOffset++;
		if (!_gr.canRead())
			continue;
		if (currentOffset >= offset) {
			obj.push(ChangeCommon.toJS(_gr));
			limit--;
		}
	}

	return obj;
};

/**
*	Get a subset of the records supplied
*	nameValuePairs : which will be used to build query unless it contains sysparm_query
*	in which case the value of sysparm_query is used to build the query
*
*	Returns Object with containing encodedQuery and fields applied and ignored
*/
ChangeCommon.buildEncodedQuery = function(nameValuePairs) {
	var result = {
		encodedQuery: '',
		fields: {
			applied: [],
			ignored: []
		}
	};

	if (!nameValuePairs || typeof nameValuePairs === 'undefined')
		return result;

	var gr = new GlideRecord('change_request');
	if (nameValuePairs.sysparm_query && typeof nameValuePairs.sysparm_query !== 'undefined') {
		var sysparmQuery = nameValuePairs.sysparm_query + '';
		var queryString = new GlideQueryString('change_request', sysparmQuery);
		queryString.deserialize();
		var terms = queryString.getTerms();
		for (var i = 0; i < terms.size(); i++) {
			var term = terms.get(i);
			var field = term.getTermField();

			// handle ^EQ at end of encoded query
			if (field !== null) {
				if (gr.isValidField(field)) {
					gr.addQuery(field, term.getOperator(), term.getValue());
					result.fields.applied.push(field);
				} else
					result.fields.ignored.push(field);
			}
		}
		result.encodedQuery = gr.getEncodedQuery();
	} else {
		Object.keys(nameValuePairs).forEach(function(name) {
			var value = nameValuePairs[name] + '';
			if (gr.isValidField(name)) {
				gr.addQuery(name, value);
				result.fields.applied.push(name);
			} else
				result.fields.ignored.push(name);
		}, this);
		result.encodedQuery = gr.getEncodedQuery();
	}

	return result;
};

ChangeCommon.isNil = function(value) {
	return JSUtil.nil(value) || value === "undefined";
};

ChangeCommon.methods = {

	update: function() {
		if (!this._gr.canWrite())
			return;

		return this._gr.update();
	},

	insert: function() {
		var canCreate = this._gr.canCreate();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[insert] canCreate: " + canCreate);

		if (!canCreate)
			return;

		var sysId = this._gr.insert();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[insert] sysId: " + sysId);

		return sysId;
	},

	deleteRecord: function() {
		return this._gr.deleteRecord();
	},

	refreshGlideRecord: function() {
		var gr = new GlideRecord(this._gr.getTableName());
		gr.addQuery("sys_id", this._gr.getUniqueValue());
		gr.query();
		if (!gr._next())
			this._gr = null;
		this.initialize(gr);
	},

	getGlideRecord: function() {
		return this._gr;
	},

	setValue: function(name, value) {
		var nameValuePairs = {};
		if (name)
			nameValuePairs[name] = value || "";
		return this.setValues(nameValuePairs);
	},

	setValues: function(nameValuePairs) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[setValues] nameValuePairs: " + JSON.stringify(nameValuePairs));

		var fields = {
			applied: [],
			ignored: []
		};

		if (!nameValuePairs || !this._gr.canWrite())
			return fields;

		var encryptedFields;
		if (nameValuePairs.hasOwnProperty('encrypted_fields')) {
			if (typeof nameValuePairs.encrypted_fields === 'string')
				encryptedFields = nameValuePairs.encrypted_fields.split(',');
			else if (Array.isArray(nameValuePairs.encrypted_fields))
				encryptedFields = nameValuePairs.encrypted_fields;
			else
				encryptedFields = Object.keys(nameValuePairs.encrypted_fields);

			delete nameValuePairs.encrypted_fields;

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[setValues] encryptedFields: " + encryptedFields);
		}

		Object.keys(nameValuePairs).forEach(function(name) {
			var value = nameValuePairs[name] + "";
			if (this._gr.isValidField(name) && this.canWriteTo(name)) {
				var fieldED = this._gr[name].getED();

				// Handle Reference and Choice
				if (this.isReferenceField(fieldED))
					value = this.resolveReference(fieldED, value);
				else if (fieldED.isChoiceTable())
					value = this.resolveChoice(fieldED, value);

				//  Handle Journal Field types
				if (fieldED.getInternalType() + "" === "journal_input")
					this._gr[name].setJournalEntry(value);
				else {
					// Support for encrypted fields
					if (encryptedFields && Array.isArray(encryptedFields) && encryptedFields.indexOf(name) !== -1)
						this._gr.setDisplayValue(name, value);
					else
						this._gr.setValue(name, value);
				}

				fields.applied.push(name);
			} else
				fields.ignored.push(name);
		}, this);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[setValues] fields: " + JSON.stringify(fields));

		return fields;
	},

	resolveReference: function(fieldED, value) {
		if (!fieldED || !value)
			return value;

		var referenceKey = fieldED.getReferenceKey();
		if (referenceKey !== null && referenceKey + "" !== "sys_id")
			return value;

		var resolvedSysId = GlideReferenceField.getSysID(fieldED.getReference(), value, false);
		resolvedSysId = GlideStringUtil.notNil(resolvedSysId) ? resolvedSysId : value;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[resolveReference] resolvedSysId: " + resolvedSysId + " value: " + value);

		return resolvedSysId;
	},

	resolveChoice: function(fieldED, value) {
		if (!fieldED || !value)
			return value;

		var fieldChoices = GlideChoiceList.getChoiceList(this._gr.getRecordClassName(), fieldED.getName());
		if (fieldChoices.size() === 0)
			return value;

		// Case sensitive matching of choice value
		for (var i = 0; i < fieldChoices.getSize(); i++)
			if (fieldChoices.getChoice(i).getValue() + "" === value + "")
				return value;

		// Case insensitive matching of choice value
		for (var j = 0; j < fieldChoices.getSize(); j++) 
			if ((fieldChoices.getChoice(j).getValue() + "").toUpperCase() === value.toUpperCase())
				return value;

		// Try and match using label instead
		var valueByLabel = fieldChoices.getValueOf(value);

		if (valueByLabel)
			return valueByLabel;

		// Case insensitive matching of choice Label
		for (var k = 0; k < fieldChoices.getSize(); k++)
			if ((fieldChoices.getChoice(k).getLabel() + "").toUpperCase() === value.toUpperCase())
				return fieldChoices.getChoice(k).getValue();

		// We allow non-existent choice values, but Table REST API checks glide.rest.choice.allow_non_existing_value === true
		// However implementing this check would change behaviour for existing customers
		return value;
	},

	isReferenceField: function(fieldED) {
		if (!fieldED)
			return false;

		var internalType = fieldED.getInternalType() + "";
		var isReferenceFieldType = internalType === "reference" || internalType === "domain_id" || internalType === "glide_var";

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_isReferenceField] isReferenceFieldType: " + isReferenceFieldType + " internalType: " + internalType);

		return isReferenceFieldType;
	},

	canWriteTo: function(fieldName) {
		if (!fieldName)
			return false;

		var canWrite = this._gr[fieldName].canWrite();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[canWriteTo] fieldName: " + fieldName + " canWrite: " + canWrite);

		return canWrite;
	}
};

ChangeCommon.filters = {

	sysId: function(sysId) {
		var re = /^[a-f0-9]{32}$/i;
		return re.test(sysId);
	},

	unique: function(value, index, arr) {
		return arr.indexOf(value) === index;
	}

};
```