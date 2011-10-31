const Mainloop = imports.mainloop;
const Shell = imports.gi.Shell;
const St = imports.gi.St;

const Main = imports.ui.main;
const Tweener = imports.tweener.tweener;
const Workspace = imports.ui.workspace;

const WINDOWOVERLAY_ICON_SIZE = 32;

let wsWinOverInjections, createdActors;

function injectToFunction(parent, name, func) {
    let origin = parent[name];
    wsWinOverInjections[name] = origin;
    parent[name] = function() {
        let ret;
        ret = origin.apply(this, arguments);
        if (ret === undefined)
                ret = func.apply(this, arguments);
        return ret;
    }
}

function resetState() {
    wsWinOverInjections = { };
    createdActors = [ ];
}

function enable() {
    resetState();
    
    injectToFunction(Workspace.WindowOverlay.prototype, '_init', function(windowClone, parentActor) {
        let icon = null;
        
        let tracker = Shell.WindowTracker.get_default();
        let app = tracker.get_window_app(windowClone.metaWindow);
        
        if (app) {
            icon = app.create_icon_texture(WINDOWOVERLAY_ICON_SIZE);
        }
        if (!icon) {
            icon = new St.Icon({ icon_name: 'applications-other',
                                 icon_type: St.IconType.FULLCOLOR,
                                 icon_size: WINDOWOVERLAY_ICON_SIZE });
        }
        icon.width = WINDOWOVERLAY_ICON_SIZE;
        icon.height = WINDOWOVERLAY_ICON_SIZE;
        
        this._applicationIconBox = new St.Bin({ style_class: 'windowoverlay-application-icon-box' });
        this._applicationIconBox.set_opacity(255);
        this._applicationIconBox.add_actor(icon);
        
        createdActors.push(this._applicationIconBox);
        parentActor.add_actor(this._applicationIconBox);
    });
    
    injectToFunction(Workspace.WindowOverlay.prototype, 'hide', function() {
        this._applicationIconBox.hide();
    });
    
    injectToFunction(Workspace.WindowOverlay.prototype, 'show', function() {
        this._applicationIconBox.show();
    });
    
    injectToFunction(Workspace.WindowOverlay.prototype, '_onEnter', function() {
        Tweener.addTween(this._applicationIconBox, { time: 0.2,
                                                     opacity: 50,
                                                     transition: 'linear' });
    });
    
    injectToFunction(Workspace.WindowOverlay.prototype, '_onLeave', function() {
        Tweener.addTween(this._applicationIconBox, { time: 0.2,
                                                     opacity: 255,
                                                     transition: 'linear' });
    });
    
    injectToFunction(Workspace.WindowOverlay.prototype, 'updatePositions', function(cloneX, cloneY, cloneWidth, cloneHeight) {
        let icon = this._applicationIconBox;
        
        let iconX = cloneX - icon.width/2;
        let iconY = cloneY - icon.height/2;
        
        icon.set_position(Math.floor(iconX), Math.floor(iconY));
    });
    
    injectToFunction(Workspace.WindowOverlay.prototype, '_onDestroy', function() {
        this._applicationIconBox.destroy();
    });

}

function removeInjection(object, injection, name) {
    if (injection[name] === undefined)
        delete object[name];
    else
        object[name] = injection[name];
}

function disable() {
    for (i in wsWinOverInjections) {
        removeInjection(Workspace.WindowOverlay.prototype, wsWinOverInjections, i);
    }
    for (i in createdActors) {
        i.destroy();
	}
    resetState();
}

function init() {
    /* do nothing */
}
