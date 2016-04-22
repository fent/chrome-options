chrome.options.opts.about = 'This is my about page :)';
chrome.options.addTab('General', [
  { name: '1', desc: 'Enable my feature' },
	{ name: '2', desc: 'Enable watching' },
	{ name: '3', desc: 'Allow users to start it out' },
	{ type: 'h3', desc: 'Section' },
	{ name: '4', type: 'object', options: [
		{ name: 'enabled', type: 'checkbox', desc: 'Enabled?' },
		{ name: '4', type: 'text', desc: 'Your name please' },
		{ name: '5', type: 'text', desc: 'Your jacket' },
	], desc: 'My character description (this is an object type)' },
	{ name: '4', desc: 'Try on some sushi', options: [
		{ name: 'fresh', desc: 'Fresh sushi' },
		{ name: 'roll', desc: 'Choose a type', type: 'select',
			options: [
				'Tuna Roll', 'Thumbtack Roll', 'Hairball Roll', 'Flem Roll'] },
		{ name: 'color', type: 'color', desc: 'Choose a color fish' },
	] },
	{ type: 'h3', desc: 'My List' },
	{ type: 'list', name: 'mylist', desc: 'Here\'s a list, add some stuff',
		head: true, sortable: true, fields: [
			{ type: 'select', name: 'number', desc: 'Number',
				options: ['One', 'Two'] },
			{ type: 'text', name: 'hello', desc: 'Name' },
			{ type: 'checkbox', name: 'yes', desc: 'Yeah?' },
	] }
]);
