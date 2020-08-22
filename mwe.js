#!/usr/bin/gjs

imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

class mwe {
	constructor() {
		this.application = new Gtk.Application();
		this.application.connect('activate', this._onActivate.bind(this));
		this.application.connect('startup', this._onStartup.bind(this));
	}
	_onActivate() {
		this._window.present();
	}
	_onStartup() {
		this._buildUI();
	}
	
	_buildUI() {
		this._window = new Gtk.ApplicationWindow  ({
			application: this.application,
			title: "Minimum Working Example",
			default_width: 300,
			default_height: 400,
			border_width: 20,
			window_position: Gtk.WindowPosition.CENTER });
		
		//initialize model
		this._model = new Gtk.TreeStore();
		this._model.set_column_types ([
			GObject.TYPE_BOOLEAN,
			GObject.TYPE_INT,
			GObject.TYPE_STRING ]);
		
		//populate with data
		let iter1 = null;
		let iter2 = null;
		let iter3 = null;
		iter1 = this._model.append(null);
		this._model.set(iter1,[0,1,2],[true,0,"animals"]);
			iter2 = this._model.append(iter1);
			this._model.set(iter2,[0,1,2],[true,0,"scary animals"]);
				iter3 = this._model.append(iter2);
				this._model.set(iter3,[0,1,2],[false,3,"lions"]);
				iter3 = this._model.append(iter2);
				this._model.set(iter3,[0,1,2],[false,3,"tigers"]);
				iter3 = this._model.append(iter2);
				this._model.set(iter3,[0,1,2],[false,3,"bears"]);
			iter2 = this._model.append(iter1);
			this._model.set(iter2,[0,1,2],[true,0,"friendly animals"]);
				iter3 = this._model.append(iter2);
				this._model.set(iter3,[0,1,2],[false,3,"frogs"]);
				iter3 = this._model.append(iter2);
				this._model.set(iter3,[0,1,2],[false,3,"birds"]);
				iter3 = this._model.append(iter2);
				this._model.set(iter3,[0,1,2],[false,3,"fish"]);
		iter1 = this._model.append(null);
		this._model.set(iter1,[0,1,2],[true,0,"places"]);
			iter2 = this._model.append(iter1);
			this._model.set(iter2,[0,1,2],[false,7,"paris"]);
			iter2 = this._model.append(iter1);
			this._model.set(iter2,[0,1,2],[false,7,"london"]);
		
		//set up filtered display
		let filter = this._model.filter_new(null);
		filter.set_visible_func(function (model,iter) {
			let g = model.get_value(iter,0);
			let i = model.get_value(iter,1);
			let v = model.get_value(iter,2);
			let r = false;
			if (g || i == 3){//(!g && (i == 3)) {
				r = true;
			}
			log("["+v+"]  g: "+g+",  i: "+i+", r: "+r);
			return r;
		});
		this._view = new Gtk.TreeView({
			expand: true,
			model: filter,
			enable_grid_lines: false,
			enable_tree_lines: false,
			headers_visible: false,
			level_indentation: 0 });
		let col = new Gtk.TreeViewColumn({
			title: "Value",
			expand: true });
		let cell = new Gtk.CellRendererText();
		col.pack_start(cell,true);
		col.add_attribute(cell,"text",2);
		this._view.insert_column(col,0);
		this._view.expand_all();
		this._view.set_show_expanders(false);
		
		this._scroll = new Gtk.ScrolledWindow({ expand: true });
		this._scroll.add(this._view);
		this._window.add (this._scroll);
		this._window.show_all();
	}
};

let app = new mwe ();
app.application.run (ARGV);

