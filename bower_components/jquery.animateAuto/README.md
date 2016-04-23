#jquery.animateAuto

A jQuery plugin for animating an element's height or width from something to `auto` or `auto` to something.

This one should be somewhat more reliable, flexible, customizable, and easy-to-reuse than the slap-and-dash solutions you found with your Google search. At least, that's the goal.

## Arguments

The following arguments **are all optional** and can be passed **in any order**.

You might also consider skipping to the examples at the bottom, especially if you've seen this before.


### jQuery.animate() Options

Make sure you're familiar with [how to use jQuery.animate()](http://api.jquery.com/animate/). I will quote the jQuery docs below.

#### duration

- type: `Number` or `String`
- default: `400`
- options: Any number. The strings `'slow'` and `'fast'`.

> A string or number determining how long the animation will run.

```javascript
// e.g.
$('#element').animateAuto('slow');
$('#element').animateAuto(300);
```

#### easing

- type: `String`
- default: `'swing'`
- options: `'swing'` or `'linear'`

> A string indicating which easing function to use for the transition.

Additional plugins can allow for more easing options.

```javascript
// e.g.
$('#element').animateAuto('linear');
```

#### callback

- type: `Function`

> A function to call once the animation is complete.

```javascript
// e.g.
$('#element').animateAuto(function() {
  alert('You did it!');
});

function cheer() {
  alert('Hooray!');
}

$('#element').animateAuto(cheer);
```

### Plugin Options

- type: `Object` or a limited variety of `String`s

Pass an object argument and it will be interpreted as `options`. The default options object looks like this:

```javascript
{
  dimension: 'height', // or 'width'
  action: 'toggle', // or 'open' or 'close'
  closed: 0,
  openClass: 'is-opened'
}
```

These defaults can be modified for your project by changing `$.fn.animateAuto.defaults`.

Some options can be passed as isolated strings, also, as specified below.

The following options are available:

#### dimension

- type: `String`
- default: `'height'`
- options: `'height'`, `'width'`
- passed as: an isolated string or part of the Options object.
 
Which dimension should be animated to or from `auto`?

The default is `'height'`, and that's probably what you want to do. If you want to animate width, be warned that *width only works if the content has a fixed height, or a min-height and content that will not exceed that min-height as width expands.*

```javascript
// e.g.
$('#element').animateAuto('width');
$('#element').animateAuto({
  dimension: 'width'
});
```

#### action

- type: `String`
- default: `'toggle'`
- options: `'height'`, `'open'`, `'close'`
- passed as: an isolated string or part of the Options object.


Which action should be performed?

```javascript
// e.g.
$('#element').animateAuto('open');
$('#element').animateAuto({
  action: 'open'
});
```

#### closed

- type: `Number`
- default: `0`
- passed as: part of the Options object.

What is the height of the element when it is closed? *Must be a pixel value.*

```javascript
// e.g.
$('#element').animateAuto({
  closed: 30
});
```

#### openClass

- type: `String`
- default: `is-opened`
- passed as: part of the Options object.

What class should be applied to the element when it is opened?

This class is used within the plugin to test whether or not the element is opened. It can also be used by you to add CSS rules to the open state.

```javascript
// e.g.
$('#element').animateAuto({
  openClass: 'thing-active'
});
```

## Examples

```javascript
// Default
$('#element').animateAuto();

// Close the element (or if it's already closed, ignore)
$('#element').animateAuto('close');

// Use linear easing and fast animation
$('#element').animateAuto('linear', 'fast');

// Animate width
$('#element').animateAuto('width');

// Use a callback and pass a couple of options
function doThisAfter() {
  // something you want done
}
$('#element').animateAuto({
  dimension: 'width',
  action: 'close'
}, doThisAfter);

// Make a button animate the height of your
// element to `auto`.
$('#button').click(function() {
  $('#element').animateAuto();
});

// Different open and close buttons.
$('#open-button').click(function() {
  $('#element').animateAuto('open');
});
$('#close-button').click(function() {
  $('#element').animateAuto('close');
});

// Only open, and add a special openClass,
// then call a callback.
$('#element').animateAuto({
  action: 'open'
  openClass: 'thing-active'
}, function() {
  alert('You did it again!');
});

// or do the same thing with differently written arguments
$('#element').animateAuto('open', function() {
  alert('Three cheers for you!');
}, { openClass: 'thing-active' });

// Animate width with the animation set to 100ms
// with linear easing and a closed height of 40px
$('#element').animateAuto({
  dimension: 'width'
  closed: 40
}, 100, 'linear');

// or do the same thing with differently written arguments
$('#element').animateAuto('width', 'linear', 100, {
  closed: 40
});

// Change the default openClass for your project
$.fn.animateAuto.defaults.openClass = 'my-different-class';
```
