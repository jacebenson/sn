---
title: "JsonCi"
id: "jsonci"
---

API Name: global.JsonCi

```js
/* jshint -W030, -W083 */

var JsonCi;

/*
  Write a JS object to the database. Member names of that object are table names.
The corresponding values are arrays of objects to write to that table.  Objects in
the arrays can have references to each other - these represent referrals in the
database.

The schema below defines the stuff that can't be stored in a JS object (at
least it can't be stored in a natural way.)  The table name is the member name
in the schema.

"index" defines the data that uniquely identifies the object - this is what we use
to find an existing object to update.  Three different types of indexes are supported:
1. An array of column names: These values must be in the input data and all are used to
search the database.
2. A function: The function is called with 3 parameters: a GlideRecord, a javascript
object and an "addQuery" function.  The index function should use the GlideRecord to
query the database.  The javascript object contains the data in the input payload.
The addQuery() parameter is a convenience method to validate data and call addQuery()
on the glide record (the first parameter).  The function should return true, false
or undefined (see #3).  If the function returns true the glide record parameter must
point to the correct record in the database.

Multiple indexes are allowed.  To use multiple indexes put them into an array.  Each index
in the array will be tried, in order, to find a matching record.

"relations" describes the relationships to be created.  Example:
    cmdb_ci_veritas_disk_group: { relations: { disks: 'Contains::Contained by' } }
This says that a cmdb_ci_veritas_disk_group object can have a member named 'disks'.
The disk group "Contains" the disk, while the disk is "Contained by" the group.
disk_group.disks can be an array to represent a one to many relationship.

"reclassify" can be used to reclassify records to a new table.  Its members are other
tables to search.  The value of each member is any combination of indexes described
above.

The schema for each table may define five functions that will be called once
for each object:
1) fixup(rec):  Called on each record during preparation.  Nothing has been written
                to the database, so no sys_ids or GlideRecords are available.
2) preWriteInit(obj, gr): Allows action on pre-existing record if found, before the preWrite
					obj might not contain the sys ids of referenced objects at this time
					'gr' is the pre-existing record without any of the new JS object data
3) preWrite(obj, gr): Called immediately prior to writing the record to the database.
                      'gr' has all values from the JS object.
					  Return false (not falsey) to skip writing the record
					  A default pre-write function will set first_discovered,
					  last_discovered, discovery_source and location.  If you
					  override this, you can call the default like
					      JsonCi.discoveryPreWrite(obj, gr);
4) postWrite(obj, gr): Called immediately after writing the record to the database.
                       The object won't be written if no values have changed, in
					   which case postWrite() will never be called.
					   A default post-write function will set the object source.
					   If you override this, you can call the default like
					       JsonCi.discoveryPostWrite(obj, gr);
5) preWriteRels(obj): Called prior to writing relationships for an object.  All
                      objects will have been written, so relationships can be
					  fixed up to use sys_ids of new records.
*/

(function() {

var results, schema, isDebugging, location, statusId, mutexPrefix, useCriticalSection,
	sourceName = gs.getProperty('glide.discovery.source_name', "ServiceNow"),
	staleCache = { },
	reltypes = { },
	g_disco_functions = new DiscoveryFunctions();

JsonCi = {
	prepare: prepare,
	writeJsObject: writeJsObject,
	writeRelationships: writeRelationships,
	updateRelationships: updateRelationships,
	discoveryPreWrite: discoveryPreWrite,
	discoveryPostWrite: discoveryPostWrite,
	iterate: iterate,
	reattach: reattach,
	getRecord: getRecord
};

function prepare(args) {
	setArgs(args);

	// Remap any fields that need to be renamed
	iterate(remapFields);

	// Find out which fields are in the database
	getFields();

	// Add the table name to the object for convenience
	iterate(setSysClassName);
	// Add a toString() function for debugging
	iterate(setToString);

	// Fix up the data if the caller wants to
	iterate(function(rec, tableName) { var fixup = schema[tableName].fixup;  fixup && fixup(rec); });

	// It's possible for the fixup functions to create records - e.g. the vCenter sensor creates
	// endpoints for vnics & vdisks when CMP is active.  We set sys_class_name and toString before
	// calling fixup in case they're needed by the fixup function.  We're doing it again after
	// fixup to catch any records that were created by fixup.
	iterate(setSysClassName);
	iterate(setToString);

	// Avoids a possible stack overflow in the base sensor processor
	if (!args.leaveCurrent)
		current = { };

	return results;

	function setSysClassName(rec, tableName) { rec.sys_class_name = tableName; }
}

function writeJsObject(args) {
	setArgs(args);
	iterate(writeObject);
}

function writeRelationships(args) {
	setArgs(args);
	iterate(writeRels);
}

function updateRelationships(args) {
	setArgs(args);
	iterate(updateRels);
}

// Default pre-write function for Discovery.  Update discovery_source and last_discovered,
// set first_discovered on new records, set location if it's available.
function discoveryPreWrite(obj, gr) {
	var now = '' + new GlideDateTime();

	gr.discovery_source = sourceName;
	gr.setValue('last_discovered', now);
	if(!gr.first_discovered)
		gr.setValue('first_discovered', now);
	if (location)
		gr.location = location;
}

// Default post-write function for Discovery.  Update the object source for the record.
function discoveryPostWrite(obj, gr) {
	var os;

	if (JSUtil.notNil(statusId)) {
		os = new ObjectSource(sourceName, obj.sys_class_name, obj.sys_id, statusId.source);
		os.setValue("last_scan", new GlideDateTime().getDisplayValue());
		os.process();
	}
}

/*
 * Arguments are passed in a single object (for the caller's convenience).  Extract
 * the arguments for our convenience.
 */
function setArgs(args) {
	results = args.results;

	if (typeof results == 'string')
		results = JSON.parse(results);
	// Object references were broken (by decircularize()) for serialization.
	// Rebuild the original object.
	if (results['$^1'])
		results = reattach(results);
	// We may have parsed and/or reattached results.  Stick it back into
	// args so we don't have to do either again.
	args.results = results;

	schema = args.schema;
	isDebugging = args.isDebugging;

	location = args.location;
	statusId = args.statusId;

	mutexPrefix = args.mutexPrefix || 'mutex';
	useCriticalSection = args.useCriticalSection;
}

// Get all the db fields in my tables, so I can ignore any extra data in the JS object.
function getFields() {
	var tableName, gt, fieldNames, table, i;

	for (tableName in schema) {
		gt = new GlideTable(tableName);
		fieldNames = gt.getFieldNames().toArray();

		table = schema[tableName];
		table.fields = { };

		for (i = 0; i < fieldNames.length; i++)
			table.fields[fieldNames[i]] = 1;
	}
}

// Call 'fn' for everything in args.results
function iterate(fn, args) {
	var tableName, tableData;

	args && setArgs(args);

	// Iterate over all the tables
	for (tableName in schema) {
		// Iterate over every object in the table
		results[tableName].forEach(callFn);
	}

	// Call the function passed to iterate() inside a try/catch so
	// an exception won't abort the entire sensor.  Note that (almost)
	// everything is intentionally executed through iterate() because
	// of this try/catch.
	function callFn(rec) {
		try {
			fn(rec, tableName);
		} catch(e) {
			gs.log(e.toString());
			gs.log(e.stack);
		}
	}
}

// Remap field names if the caller wants me to.
// We don't delete the original field (because it's not necessary).
function remapFields(rec, tableName) {
	var name, newName,
		remap = schema[tableName].remap;
	if (remap) {
		for (name in rec) {
			newName = remap[name];
			if (newName)
				rec[newName] = rec[name];
		}
	}
}

// Set a toString() function on the object, for easy debugging.
// The string will include the values in the object's index fields,
// along with its sys_id (if it's not a new record), and whether its
// clean or dirty.
function setToString(rec) {

	rec.toString = rec.toString || function() {

		var name, isNew,
			idxName = [ ],
			tableName = rec.sys_class_name,
			tableSchema = schema[tableName],
			idx = tableSchema && tableSchema.index;

		if (!idx)
			return tableName + ' ' + rec.sys_id;

		if (idx[0] instanceof Array)
			idx.forEach(addValues);
		else
			addValues(idx);

		idx = idxName.join(', ');

		name = (isNew ? 'new ' : '') + tableName + ': ' + idx;
		if (rec.sys_id)
			name += ' (sys_id ' + rec.sys_id + ')';
		name += rec.isClean ? ' (clean)' : ' (dirty)';
		return '[ ' + name + ' ]';

		function addValues(idx) {
			idx.forEach(function(name) {
				var val = rec[name];
				if (val === undefined)
					isNew = 1;
				else
					idxName.push(name + ': ' + val);
			});
		}
	};
}

// Write a JS object to the database.  References to other objects will write the sys_id
// of those objects.  If the sys_id isn't available that object will be written first.
// This code tries to be safe, simple & reasonably performant.
// Safe: Objects don't have to be sanitized or ordered before writing.  The probe & sensor
//       can create whatever cross-references are convenient.
// Simple: Write references first, writing their references as necessary.  Don't allow
//         recursion to any object currently on the stack.  Keep trying as long as
//         we're making progress.
// Performant: Keep track of clean objects and cut recursion off as quickly as possible.
//
// Note that we're only trying to write 'obj'.  Anything else that gets written is a side
// effect.
function writeObject(obj) {

	var temp, progress,
		stack = [ ],
		deferred = [ ],
		forced = [ ];

	// The objects we're writing to the database are static for the duration of the
	// sensor.  Once I've written an object there's no reason to write it again.
	if (obj.isClean)
		return true;

	// First, just try to write the object, recursing to sub-objects as necessary.
	// The first attempt to write it may fail, so keep trying as long as we're
	// making any progress.
	do {
		progress = false;
		if (writeRec(obj))
			return;
	} while (progress);

	// If we failed to write the object because of missing sys_ids, go back
	// and force write everything that was deferred.
	temp = deferred;
	deferred = [ ];
	writeAll(temp);

	// Forced writes will fail if the missing sys_id is part of the object's
	// index.  These records should be writable now.
	writeAll(deferred);

	// Finally, go back and update any forced writes with sys_ids of the things
	// we couldn't force write the first time.
	writeAll(forced);

	// Really finally, make sure we wrote the object we were asked to write.
	writeRec(obj);

	function writeAll(arr) {

		// Force write any deferred objects.  Forced writes can be deferred if
		// we're missing part of the objects index.
		arr.forEach(function(o) { writeRec(o, true); });
	}

	function writeRec(obj, force) {
		var val, name, gr, idx, fields,
			canWrite = true,                  // Do we have sys_ids for all references?
			tableSchema = schema[obj.sys_class_name],
			preWriteInit = tableSchema.preWriteInit,
			preWrite = tableSchema.preWrite || discoveryPreWrite,
			postWrite = tableSchema.postWrite || discoveryPostWrite;

		// Have to check isClean here!
		if (obj.isClean || !tableSchema)
			return true;

		fields = tableSchema.fields;

		// Try to get a GlideRecord for the object.  This will fail if I don't
		// have the data in the record's index (if the index includes a sys_id
		// of a record I haven't tried to write yet).
		gr = obj.gr || getRecord(obj, tableSchema);
		if (preWriteInit)
			preWriteInit(obj, gr);

		for (name in obj) {

			// Skip anything that's not in the database
			if (fields[name] != 1)
				continue;

			val = obj[name];

			if (val instanceof Packages.java.lang.String)
				val = '' + val;

			// If it's a reference, we need to write it first
			if (val && (typeof val == 'object')) {

				if (!val.sys_id) {
					// Avoid infinite loops.  Kind of a pain, but
					// the stack should never get very deep.
					if (stack.indexOf(val) != -1) {
						canWrite = false;
						continue;
					}

					stack.push(val);
					canWrite = writeRec(val, force) && canWrite;
					stack.pop();
				}
				val = val.sys_id;
			}

			if (gr)
				gr[name] = val;
		}

		// We may have deferred this object, or it may
		// need to be deferred.
		idx = deferred.indexOf(obj);

		// We won't have gr if we don't have everything in the object's index.
		if (gr && (canWrite || force)) {

			if (!obj.isClean) {
				// Return false (not falsey!) from preWrite to skip writing the record
				if (preWrite(obj, gr) !== false) {
					obj.sys_id = '' + gr.update();
					postWrite(obj, gr);
				}
			}

			if (canWrite)
				obj.isClean = true;
			else
				forced.push(obj);

			// Save the GlideRecord if we're going to need it again.  Otherwise
			// make sure to clear it so it can be garbage collected.
			obj.gr = obj.isClean ? 0 : gr;
			progress = true;

			if (idx != -1)
				deferred.splice(idx, 1);

			return true;
		}

		// We're not writing it.  The first time we choose to defer it counts
		// as progress.
		if (idx == -1) {
			deferred.push(obj);
			progress = true;
		}
	}
}

// Write relationships for an object, remove incorrect relationships and update object staleness.  In the
// schema, relationship member names must be the table names of the related records.  For example, using
// this schema:
//schema = {
//	cmdb_ci_vcenter: {
//		parentOf: {
//			cmdb_ci_esx_server: 'Members::Member of'
//		}
//	}
//};
//
// and this object:
//
// {
//	cmdb_ci_vcenter: [ {
//		name: 'vCenterOne',
//		cmdb_ci_esx_server: [ sysId1, sysId2 ]
//	}]
//}
//
// Will create/update a vCenter named 'vCenterOne' and will create relationships with two cmdb_ci_esx_servers.
// Relationships to any other esx servers will be deleted.  If we're removing a relationship to an ESX server
// and it's the last relationship (to any vcenter), the relationship will remain intact and the ESX server
// will be marked as stale.
////////////////////////////////////////////////////////////////////////////////////////////////////////////
function updateRels(obj) {

	var otherTable, currentRelType, currentRelSysId, desiredRelMap, desiredRels, gr, stalenessMap, unwantedMap, name, otherRels,
		currentGen, otherGen, relList,
		table = '' + obj.sys_class_name,
		tableSchema = schema[table],
		preWrite = tableSchema.preWriteRels;

	preWrite && preWrite(obj);

	// I have to do the exact same thing twice, once for records that 'obj' is the parent of and once
	// for records that it's the child of.  currentGen hold the generation (parent or child) of my object.
	// otherGen holds the opposite generation (child or parent)
	currentGen = 'parent';
	otherGen = 'child';
	relList = tableSchema.relations || tableSchema.parentOf;
	updateGenRels();

	currentGen = 'child';
	otherGen = 'parent';
	relList = tableSchema.reverseRelations || tableSchema.childOf;
	updateGenRels();

	function updateGenRels() {

		var otherSysId, updateRelCount;

		// Walk through all tables that we have relationships for.
		for (otherTable in relList) {

			// Get the sys_id of the relationship type
			currentRelType = relList[otherTable];
			currentRelSysId = getRelType(currentRelType);
			unwantedMap = { };

			// 1. Create a map for sys_ids of desired relationships
			desiredRelMap = { };
			desiredRels = obj[otherTable];
			if (!desiredRels)
				desiredRels = [ ];
			else if (!(desiredRels instanceof Array))
				desiredRels = [ desiredRels ];
			desiredRels.forEach(function(rel) { desiredRelMap[rel.sys_id || rel] = 1; });
			// Count how many rels we're going to update (add or delete).  If it's 0
			// there's no reason to acquire the critical section.
			updateRelCount = desiredRels.length;

			// 2. Walk existing rels, figure out what to keep & what to delete
			gr = new GlideRecord('cmdb_rel_ci');
			gr.addQuery(currentGen, obj.sys_id);
			gr.addQuery(otherGen + '.sys_class_name', otherTable);
			gr.addQuery('type', currentRelSysId);
			gr.query();

			while (gr.next()) {
				otherSysId = '' + gr[otherGen];
				if (desiredRelMap[otherSysId]) {
					// We want the relationship and it already exists
					delete desiredRelMap[otherSysId];
					updateRelCount--;
				}
				else {
					updateRelCount++;
					// We found an existing relationship we don't want.  Save
					// what we're going to need to fix it.
					unwantedMap[gr.sys_id] = otherSysId;
				}
			}

			// 3. Update relationships inside a critical section
			if (updateRelCount) {
				if (useCriticalSection)
					Mutex.enterCriticalSection(getMutexName(), 0, doRelUpdate);
				else
					doRelUpdate();
			}
		}
	}

	function doRelUpdate() {
		var names;

		// Fix unwanted rels
		for (name in unwantedMap) {
			if (!isStale(unwantedMap[name])) {
				gr = new GlideRecord('cmdb_rel_ci');
				gr.addQuery('sys_id', name);
				gr.query();
				if (gr.next())
					gr.deleteRecord();
			}
		}

		// Create new rels
		for (name in desiredRelMap) {
			if (currentGen == 'parent')
				g_disco_functions.createRelationshipIfNotExists(obj.sys_id, name, currentRelType);
			else
				g_disco_functions.createRelationshipIfNotExists(name, obj.sys_id, currentRelType);
		}
	}

	function getMutexName() {
		var name = [ table, otherTable ];

		name.sort();
		name.unshift(mutexPrefix);
		return name.join('_');
	}
}

function isStale(sys_id) {

	if (!staleCache.hasOwnProperty(sys_id)) {
		var staleness = JSON.parse(SNC.DiscoveryCIReconciler.isStale('["' + sys_id + '"]'));
		staleCache[sys_id] = !!staleness[sys_id];
	}

	return !!staleCache[sys_id];
}

// Write all the relationships for an object.
////////////////////////////////////////////////////////////////////////////////////////////////////////////
function writeRels(obj) {
	var name, val, relType,
		tableSchema = schema[obj.sys_class_name],
		preWrite = tableSchema.preWriteRels,
		relations = tableSchema.relations || tableSchema.parentOf,
		reverseRelations = tableSchema.reverseRelations || tableSchema.childOf;

	preWrite && preWrite(obj);

	// It's important the the parent & child are correct in the relationship because
	//   <parent> contains::contained by <child>
	// is NOT equivalent to
	//   <child> contained by::contains <parent>
	// We don't want to force the caller to structure their references in a particular way,
	// so allow the parent/child relationship to be reversed from the natural meaning.
	iterate(relations);
	iterate(reverseRelations, 1);

	/* jshint -W004 */  // Silence incorrect warning: 'iterate' is already defined
	function iterate(relations, reverse) {
		if (!relations)
			return;

		for (name in relations) {
			relType = relations[name];
			val = obj[name];
			if (val) {
				if (val instanceof Array)
					val.forEach(writeRelationship);
				else
					writeRelationship(val);
			}
		}

		function writeRelationship(referred) {
			var parent = obj.sys_id || obj,
				child = referred.sys_id || referred;

			if (!parent || !child)
				return;

			g_disco_functions.createRelationshipIfNotExists(reverse ? child: parent, reverse ? parent : child, relType);
		}
	}
}

// Get a GlideRecord for the object.  If an existing object exists (based
// on the index defined in the schema) we'll fetch it.  If no object exists,
// return a new GlideRecord.  If we don't have enough information to tell
// if an object exists (because we don't have everything in its index)
// don't return anything.
function getRecord(obj, schema, findOnly) {

	var reclassify, completeIdx,
		indexes = schema.index,
		tableName = obj.sys_class_name;   // used by findRecord()

	if (!searchIndexes(indexes) && schema.reclassify) {
		for (tableName in schema.reclassify) {
			if (searchIndexes(schema.reclassify[tableName])) {
				obj.gr = g_disco_functions.reclassify(obj.gr, obj.sys_class_name);
				break;
			}
		}
	}

	if (obj.gr)
		return obj.gr;

	// We need to have all the data for some index to know the record doesn't exist.
	// If we didn't have complete data for at least one index
	if (!findOnly && completeIdx)
		return new GlideRecord(obj.sys_class_name);  // Must be obj.sys_class_name - tableName may have been modified during reclassification

	function searchIndexes(indexes) {
		if (typeof indexes[0] != 'string')
			return indexes.some(findRecord);

		return findRecord(indexes);
	}

	function findRecord(idx) {
		var result,
			gr = new GlideRecord(tableName);

		if ((indexes.filterRecord && indexes.filterRecord(obj, idx, tableName)) ||
			(idx.filterRecord && idx.filterRecord(obj, idx, tableName)))
			return;

		// If the index is a function then call it.  If the index is satisfied
		// the function should return true and set 'gr' to the correct record.
		if (typeof idx == 'function')
			result = idx(gr, obj, addQuery);
		else {
			if (idx.every(addQuery)) {
				gr.setLimit(1);
				gr.query();
				result = gr.next();
			}
		}

		if (result) {
			obj.sys_id = '' + gr.sys_id;
			obj.gr = gr;
		}

		completeIdx = completeIdx || (result !== undefined);

		return result;

		function addQuery(name) {
			var val = obj[name],
				ok = true;

			if (val && typeof val == 'object')
				ok = val = val.sys_id;

			if (val === undefined)
				return false;

			gr.addQuery(name, val);
			return ok;
		}
	}
}

// Re-circularize an object after it was de-circularized for serialization.
function reattach(o) {
	if (typeof o == 'string')
		o = JSON.parse(o);

	var nextId = 1,
		deferred = [ ],
		all = [ ],
		objects = o;

	reatt(o['$^1'], 0);
	while (deferred.length) {
		var o2 = deferred.pop();
		reatt(o2, 0);
	}

	all.forEach(function(o) { delete o.$objectName$; delete o.$objectNameNew$; });

	return objects['$^1'];

	function reatt(o, depth) {
		if (o.$objectNameNew$) {
			if (depth)
				return;
		} else {
			id = '$^' + nextId.toString(36);
			objects[id] = o;
			nextId++;
			o.$objectNameNew$= id;
			all.push(o);
		}

		// This has to match the number in the MID's JsonCi script include.
		// See that include for an explanation of why we need it.
		if (depth == 100) {
			deferred.push(o);
			return;
		}

		Object.keys(o).sort().forEach(
			function(name) {
				if (name == '$objectName$' || name == '$objectNameNew$')
					return;
				var val = o[name];
				if (typeof val == 'string') {
					if (objects.hasOwnProperty(val))
						val = o[name] = objects[val];
				}

				if ((typeof val == 'object') && (val !== null))
					reatt(val, depth + 1);
			});
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////
function getRelType(relationship) {
	reltypes[relationship] = (reltypes[relationship] || g_disco_functions.findCIRelationshipType('cmdb_rel_type', relationship));
	return reltypes[relationship];
}

})();

```