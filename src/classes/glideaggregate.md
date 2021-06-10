---
id: glideaggregate
title: GlideAggregate
---

## addAggregate
Adds an aggregate
```js
var count = new GlideAggregate('io_set_item');
//parm1: COUNT, MIN, MAX, parm2: field
count.addAggregate('COUNT', 'variable_set');
count.query();
while (count.next()) {
   var set = count.variable_set.getDisplayValue();
   var setCount = count.getAggregate('COUNT', 'variable_set');
   var message = "The are currently " + setCount;
   message += " items with a variable set of " + set;
   gs.print(message);
}
/*Output
[0:00:00.345] Script completed in scope global: script
*** Script: The are currently 1 items with a variable set of Generic Request
*** Script: The are currently 154 items with a variable set of Request For
*/
```

## getAggregate
Gets an aggregate

```js
var count = new GlideAggregate('io_set_item');
//parm1: COUNT, MIN, MAX, parm2: field
count.addAggregate('COUNT', 'variable_set');
count.query();
while (count.next()) {
   var set = count.variable_set.getDisplayValue();
   var setCount = count.getAggregate('COUNT', 'variable_set');
   var message = "The are currently " + setCount;
   message += " items with a variable set of " + set;
   gs.print(message);
}
/*Output
[0:00:00.345] Script completed in scope global: script
*** Script: The are currently 1 items with a variable set of Generic Request
*** Script: The are currently 154 items with a variable set of Request For
*/
```

## getAggregateEncodedQuery
Gets an aggregate’s encoded query.

## orderByAggregate
Orders a-z an aggregate.

## setGroup
Sets whether the results are to be grouped