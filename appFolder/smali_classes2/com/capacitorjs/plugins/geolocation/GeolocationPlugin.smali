.class public Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;
.super Lcom/getcapacitor/Plugin;
.source "GeolocationPlugin.java"


# annotations
.annotation runtime Lcom/getcapacitor/annotation/CapacitorPlugin;
    name = "Geolocation"
    permissions = {
        .subannotation Lcom/getcapacitor/annotation/Permission;
            alias = "location"
            strings = {
                "android.permission.ACCESS_COARSE_LOCATION",
                "android.permission.ACCESS_FINE_LOCATION"
            }
        .end subannotation,
        .subannotation Lcom/getcapacitor/annotation/Permission;
            alias = "coarseLocation"
            strings = {
                "android.permission.ACCESS_COARSE_LOCATION"
            }
        .end subannotation
    }
.end annotation


# static fields
.field static final COARSE_LOCATION:Ljava/lang/String; = "coarseLocation"

.field static final LOCATION:Ljava/lang/String; = "location"


# instance fields
.field private implementation:Lcom/capacitorjs/plugins/geolocation/Geolocation;

.field private watchingCalls:Ljava/util/Map;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/Map<",
            "Ljava/lang/String;",
            "Lcom/getcapacitor/PluginCall;",
            ">;"
        }
    .end annotation
.end field


# direct methods
.method static bridge synthetic -$$Nest$mgetJSObjectForLocation(Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;Landroid/location/Location;)Lcom/getcapacitor/JSObject;
    .locals 0

    invoke-direct {p0, p1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->getJSObjectForLocation(Landroid/location/Location;)Lcom/getcapacitor/JSObject;

    move-result-object p0

    return-object p0
.end method

.method public constructor <init>()V
    .locals 1

    .line 27
    invoke-direct {p0}, Lcom/getcapacitor/Plugin;-><init>()V

    .line 32
    new-instance v0, Ljava/util/HashMap;

    invoke-direct {v0}, Ljava/util/HashMap;-><init>()V

    iput-object v0, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->watchingCalls:Ljava/util/Map;

    return-void
.end method

.method private completeCurrentPosition(Lcom/getcapacitor/PluginCall;)V
    .locals 3
    .param p1, "call"    # Lcom/getcapacitor/PluginCall;
    .annotation runtime Lcom/getcapacitor/annotation/PermissionCallback;
    .end annotation

    .line 97
    const-string v0, "coarseLocation"

    invoke-virtual {p0, v0}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->getPermissionState(Ljava/lang/String;)Lcom/getcapacitor/PermissionState;

    move-result-object v0

    sget-object v1, Lcom/getcapacitor/PermissionState;->GRANTED:Lcom/getcapacitor/PermissionState;

    if-ne v0, v1, :cond_0

    .line 98
    iget-object v0, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->implementation:Lcom/capacitorjs/plugins/geolocation/Geolocation;

    .line 99
    invoke-direct {p0, p1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->isHighAccuracy(Lcom/getcapacitor/PluginCall;)Z

    move-result v1

    new-instance v2, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin$1;

    invoke-direct {v2, p0, p1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin$1;-><init>(Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;Lcom/getcapacitor/PluginCall;)V

    .line 98
    invoke-virtual {v0, v1, v2}, Lcom/capacitorjs/plugins/geolocation/Geolocation;->sendLocation(ZLcom/capacitorjs/plugins/geolocation/LocationResultCallback;)V

    goto :goto_0

    .line 113
    :cond_0
    const-string v0, "Location permission was denied"

    invoke-virtual {p1, v0}, Lcom/getcapacitor/PluginCall;->reject(Ljava/lang/String;)V

    .line 115
    :goto_0
    return-void
.end method

.method private completeWatchPosition(Lcom/getcapacitor/PluginCall;)V
    .locals 2
    .param p1, "call"    # Lcom/getcapacitor/PluginCall;
    .annotation runtime Lcom/getcapacitor/annotation/PermissionCallback;
    .end annotation

    .line 141
    const-string v0, "coarseLocation"

    invoke-virtual {p0, v0}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->getPermissionState(Ljava/lang/String;)Lcom/getcapacitor/PermissionState;

    move-result-object v0

    sget-object v1, Lcom/getcapacitor/PermissionState;->GRANTED:Lcom/getcapacitor/PermissionState;

    if-ne v0, v1, :cond_0

    .line 142
    invoke-direct {p0, p1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->startWatch(Lcom/getcapacitor/PluginCall;)V

    goto :goto_0

    .line 144
    :cond_0
    const-string v0, "Location permission was denied"

    invoke-virtual {p1, v0}, Lcom/getcapacitor/PluginCall;->reject(Ljava/lang/String;)V

    .line 146
    :goto_0
    return-void
.end method

.method private getAlias(Lcom/getcapacitor/PluginCall;)Ljava/lang/String;
    .locals 3
    .param p1, "call"    # Lcom/getcapacitor/PluginCall;

    .line 241
    const-string v0, "location"

    .line 242
    .local v0, "alias":Ljava/lang/String;
    sget v1, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v2, 0x1f

    if-lt v1, v2, :cond_0

    .line 243
    const/4 v1, 0x0

    invoke-static {v1}, Ljava/lang/Boolean;->valueOf(Z)Ljava/lang/Boolean;

    move-result-object v1

    const-string v2, "enableHighAccuracy"

    invoke-virtual {p1, v2, v1}, Lcom/getcapacitor/PluginCall;->getBoolean(Ljava/lang/String;Ljava/lang/Boolean;)Ljava/lang/Boolean;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/Boolean;->booleanValue()Z

    move-result v1

    .line 244
    .local v1, "enableHighAccuracy":Z
    if-nez v1, :cond_0

    .line 245
    const-string v0, "coarseLocation"

    .line 248
    .end local v1    # "enableHighAccuracy":Z
    :cond_0
    return-object v0
.end method

.method private getJSObjectForLocation(Landroid/location/Location;)Lcom/getcapacitor/JSObject;
    .locals 5
    .param p1, "location"    # Landroid/location/Location;

    .line 224
    new-instance v0, Lcom/getcapacitor/JSObject;

    invoke-direct {v0}, Lcom/getcapacitor/JSObject;-><init>()V

    .line 225
    .local v0, "ret":Lcom/getcapacitor/JSObject;
    new-instance v1, Lcom/getcapacitor/JSObject;

    invoke-direct {v1}, Lcom/getcapacitor/JSObject;-><init>()V

    .line 226
    .local v1, "coords":Lcom/getcapacitor/JSObject;
    const-string v2, "coords"

    invoke-virtual {v0, v2, v1}, Lcom/getcapacitor/JSObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lcom/getcapacitor/JSObject;

    .line 227
    const-string v2, "timestamp"

    invoke-virtual {p1}, Landroid/location/Location;->getTime()J

    move-result-wide v3

    invoke-virtual {v0, v2, v3, v4}, Lcom/getcapacitor/JSObject;->put(Ljava/lang/String;J)Lcom/getcapacitor/JSObject;

    .line 228
    const-string v2, "latitude"

    invoke-virtual {p1}, Landroid/location/Location;->getLatitude()D

    move-result-wide v3

    invoke-virtual {v1, v2, v3, v4}, Lcom/getcapacitor/JSObject;->put(Ljava/lang/String;D)Lcom/getcapacitor/JSObject;

    .line 229
    const-string v2, "longitude"

    invoke-virtual {p1}, Landroid/location/Location;->getLongitude()D

    move-result-wide v3

    invoke-virtual {v1, v2, v3, v4}, Lcom/getcapacitor/JSObject;->put(Ljava/lang/String;D)Lcom/getcapacitor/JSObject;

    .line 230
    invoke-virtual {p1}, Landroid/location/Location;->getAccuracy()F

    move-result v2

    float-to-double v2, v2

    const-string v4, "accuracy"

    invoke-virtual {v1, v4, v2, v3}, Lcom/getcapacitor/JSObject;->put(Ljava/lang/String;D)Lcom/getcapacitor/JSObject;

    .line 231
    const-string v2, "altitude"

    invoke-virtual {p1}, Landroid/location/Location;->getAltitude()D

    move-result-wide v3

    invoke-virtual {v1, v2, v3, v4}, Lcom/getcapacitor/JSObject;->put(Ljava/lang/String;D)Lcom/getcapacitor/JSObject;

    .line 232
    sget v2, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v3, 0x1a

    if-lt v2, v3, :cond_0

    .line 233
    invoke-virtual {p1}, Landroid/location/Location;->getVerticalAccuracyMeters()F

    move-result v2

    float-to-double v2, v2

    const-string v4, "altitudeAccuracy"

    invoke-virtual {v1, v4, v2, v3}, Lcom/getcapacitor/JSObject;->put(Ljava/lang/String;D)Lcom/getcapacitor/JSObject;

    .line 235
    :cond_0
    invoke-virtual {p1}, Landroid/location/Location;->getSpeed()F

    move-result v2

    float-to-double v2, v2

    const-string v4, "speed"

    invoke-virtual {v1, v4, v2, v3}, Lcom/getcapacitor/JSObject;->put(Ljava/lang/String;D)Lcom/getcapacitor/JSObject;

    .line 236
    invoke-virtual {p1}, Landroid/location/Location;->getBearing()F

    move-result v2

    float-to-double v2, v2

    const-string v4, "heading"

    invoke-virtual {v1, v4, v2, v3}, Lcom/getcapacitor/JSObject;->put(Ljava/lang/String;D)Lcom/getcapacitor/JSObject;

    .line 237
    return-object v0
.end method

.method private getPosition(Lcom/getcapacitor/PluginCall;)V
    .locals 5
    .param p1, "call"    # Lcom/getcapacitor/PluginCall;

    .line 150
    const/4 v0, 0x0

    invoke-static {v0}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    move-result-object v0

    const-string v1, "maximumAge"

    invoke-virtual {p1, v1, v0}, Lcom/getcapacitor/PluginCall;->getInt(Ljava/lang/String;Ljava/lang/Integer;)Ljava/lang/Integer;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/Integer;->intValue()I

    move-result v0

    .line 151
    .local v0, "maximumAge":I
    iget-object v1, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->implementation:Lcom/capacitorjs/plugins/geolocation/Geolocation;

    invoke-virtual {v1, v0}, Lcom/capacitorjs/plugins/geolocation/Geolocation;->getLastLocation(I)Landroid/location/Location;

    move-result-object v1

    .line 152
    .local v1, "location":Landroid/location/Location;
    if-eqz v1, :cond_0

    .line 153
    invoke-direct {p0, v1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->getJSObjectForLocation(Landroid/location/Location;)Lcom/getcapacitor/JSObject;

    move-result-object v2

    invoke-virtual {p1, v2}, Lcom/getcapacitor/PluginCall;->resolve(Lcom/getcapacitor/JSObject;)V

    goto :goto_0

    .line 155
    :cond_0
    iget-object v2, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->implementation:Lcom/capacitorjs/plugins/geolocation/Geolocation;

    .line 156
    invoke-direct {p0, p1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->isHighAccuracy(Lcom/getcapacitor/PluginCall;)Z

    move-result v3

    new-instance v4, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin$2;

    invoke-direct {v4, p0, p1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin$2;-><init>(Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;Lcom/getcapacitor/PluginCall;)V

    .line 155
    invoke-virtual {v2, v3, v4}, Lcom/capacitorjs/plugins/geolocation/Geolocation;->sendLocation(ZLcom/capacitorjs/plugins/geolocation/LocationResultCallback;)V

    .line 170
    :goto_0
    return-void
.end method

.method private isHighAccuracy(Lcom/getcapacitor/PluginCall;)Z
    .locals 4
    .param p1, "call"    # Lcom/getcapacitor/PluginCall;

    .line 252
    const/4 v0, 0x0

    invoke-static {v0}, Ljava/lang/Boolean;->valueOf(Z)Ljava/lang/Boolean;

    move-result-object v1

    const-string v2, "enableHighAccuracy"

    invoke-virtual {p1, v2, v1}, Lcom/getcapacitor/PluginCall;->getBoolean(Ljava/lang/String;Ljava/lang/Boolean;)Ljava/lang/Boolean;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/Boolean;->booleanValue()Z

    move-result v1

    .line 253
    .local v1, "enableHighAccuracy":Z
    if-eqz v1, :cond_0

    const-string v2, "location"

    invoke-virtual {p0, v2}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->getPermissionState(Ljava/lang/String;)Lcom/getcapacitor/PermissionState;

    move-result-object v2

    sget-object v3, Lcom/getcapacitor/PermissionState;->GRANTED:Lcom/getcapacitor/PermissionState;

    if-ne v2, v3, :cond_0

    const/4 v0, 0x1

    :cond_0
    return v0
.end method

.method private startWatch(Lcom/getcapacitor/PluginCall;)V
    .locals 5
    .param p1, "call"    # Lcom/getcapacitor/PluginCall;

    .line 174
    const/16 v0, 0x2710

    invoke-static {v0}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    move-result-object v0

    const-string v1, "timeout"

    invoke-virtual {p1, v1, v0}, Lcom/getcapacitor/PluginCall;->getInt(Ljava/lang/String;Ljava/lang/Integer;)Ljava/lang/Integer;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/Integer;->intValue()I

    move-result v0

    .line 175
    .local v0, "timeout":I
    const/16 v1, 0x1388

    invoke-static {v1}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    move-result-object v1

    const-string v2, "minimumUpdateInterval"

    invoke-virtual {p1, v2, v1}, Lcom/getcapacitor/PluginCall;->getInt(Ljava/lang/String;Ljava/lang/Integer;)Ljava/lang/Integer;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/Integer;->intValue()I

    move-result v1

    .line 177
    .local v1, "minUpdateInterval":I
    iget-object v2, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->implementation:Lcom/capacitorjs/plugins/geolocation/Geolocation;

    .line 178
    invoke-direct {p0, p1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->isHighAccuracy(Lcom/getcapacitor/PluginCall;)Z

    move-result v3

    new-instance v4, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin$3;

    invoke-direct {v4, p0, p1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin$3;-><init>(Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;Lcom/getcapacitor/PluginCall;)V

    .line 177
    invoke-virtual {v2, v3, v0, v1, v4}, Lcom/capacitorjs/plugins/geolocation/Geolocation;->requestLocationUpdates(ZIILcom/capacitorjs/plugins/geolocation/LocationResultCallback;)V

    .line 194
    iget-object v2, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->watchingCalls:Ljava/util/Map;

    invoke-virtual {p1}, Lcom/getcapacitor/PluginCall;->getCallbackId()Ljava/lang/String;

    move-result-object v3

    invoke-interface {v2, v3, p1}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    .line 195
    return-void
.end method


# virtual methods
.method public checkPermissions(Lcom/getcapacitor/PluginCall;)V
    .locals 1
    .param p1, "call"    # Lcom/getcapacitor/PluginCall;
    .annotation runtime Lcom/getcapacitor/PluginMethod;
    .end annotation

    .line 57
    iget-object v0, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->implementation:Lcom/capacitorjs/plugins/geolocation/Geolocation;

    invoke-virtual {v0}, Lcom/capacitorjs/plugins/geolocation/Geolocation;->isLocationServicesEnabled()Ljava/lang/Boolean;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/Boolean;->booleanValue()Z

    move-result v0

    if-eqz v0, :cond_0

    .line 58
    invoke-super {p0, p1}, Lcom/getcapacitor/Plugin;->checkPermissions(Lcom/getcapacitor/PluginCall;)V

    goto :goto_0

    .line 60
    :cond_0
    const-string v0, "Location services are not enabled"

    invoke-virtual {p1, v0}, Lcom/getcapacitor/PluginCall;->reject(Ljava/lang/String;)V

    .line 62
    :goto_0
    return-void
.end method

.method public clearWatch(Lcom/getcapacitor/PluginCall;)V
    .locals 3
    .param p1, "call"    # Lcom/getcapacitor/PluginCall;
    .annotation runtime Lcom/getcapacitor/PluginMethod;
    .end annotation

    .line 205
    const-string v0, "id"

    invoke-virtual {p1, v0}, Lcom/getcapacitor/PluginCall;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    .line 207
    .local v0, "callbackId":Ljava/lang/String;
    if-eqz v0, :cond_2

    .line 208
    iget-object v1, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->watchingCalls:Ljava/util/Map;

    invoke-interface {v1, v0}, Ljava/util/Map;->remove(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Lcom/getcapacitor/PluginCall;

    .line 209
    .local v1, "removed":Lcom/getcapacitor/PluginCall;
    if-eqz v1, :cond_0

    .line 210
    iget-object v2, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->bridge:Lcom/getcapacitor/Bridge;

    invoke-virtual {v1, v2}, Lcom/getcapacitor/PluginCall;->release(Lcom/getcapacitor/Bridge;)V

    .line 213
    :cond_0
    iget-object v2, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->watchingCalls:Ljava/util/Map;

    invoke-interface {v2}, Ljava/util/Map;->size()I

    move-result v2

    if-nez v2, :cond_1

    .line 214
    iget-object v2, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->implementation:Lcom/capacitorjs/plugins/geolocation/Geolocation;

    invoke-virtual {v2}, Lcom/capacitorjs/plugins/geolocation/Geolocation;->clearLocationUpdates()V

    .line 217
    :cond_1
    invoke-virtual {p1}, Lcom/getcapacitor/PluginCall;->resolve()V

    .line 218
    .end local v1    # "removed":Lcom/getcapacitor/PluginCall;
    goto :goto_0

    .line 219
    :cond_2
    const-string v1, "Watch call id must be provided"

    invoke-virtual {p1, v1}, Lcom/getcapacitor/PluginCall;->reject(Ljava/lang/String;)V

    .line 221
    :goto_0
    return-void
.end method

.method public getCurrentPosition(Lcom/getcapacitor/PluginCall;)V
    .locals 3
    .param p1, "call"    # Lcom/getcapacitor/PluginCall;
    .annotation runtime Lcom/getcapacitor/PluginMethod;
    .end annotation

    .line 82
    invoke-direct {p0, p1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->getAlias(Lcom/getcapacitor/PluginCall;)Ljava/lang/String;

    move-result-object v0

    .line 83
    .local v0, "alias":Ljava/lang/String;
    invoke-virtual {p0, v0}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->getPermissionState(Ljava/lang/String;)Lcom/getcapacitor/PermissionState;

    move-result-object v1

    sget-object v2, Lcom/getcapacitor/PermissionState;->GRANTED:Lcom/getcapacitor/PermissionState;

    if-eq v1, v2, :cond_0

    .line 84
    const-string v1, "completeCurrentPosition"

    invoke-virtual {p0, v0, p1, v1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->requestPermissionForAlias(Ljava/lang/String;Lcom/getcapacitor/PluginCall;Ljava/lang/String;)V

    goto :goto_0

    .line 86
    :cond_0
    invoke-direct {p0, p1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->getPosition(Lcom/getcapacitor/PluginCall;)V

    .line 88
    :goto_0
    return-void
.end method

.method protected handleOnPause()V
    .locals 1

    .line 41
    invoke-super {p0}, Lcom/getcapacitor/Plugin;->handleOnPause()V

    .line 43
    iget-object v0, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->implementation:Lcom/capacitorjs/plugins/geolocation/Geolocation;

    invoke-virtual {v0}, Lcom/capacitorjs/plugins/geolocation/Geolocation;->clearLocationUpdates()V

    .line 44
    return-void
.end method

.method protected handleOnResume()V
    .locals 2

    .line 48
    invoke-super {p0}, Lcom/getcapacitor/Plugin;->handleOnResume()V

    .line 49
    iget-object v0, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->watchingCalls:Ljava/util/Map;

    invoke-interface {v0}, Ljava/util/Map;->values()Ljava/util/Collection;

    move-result-object v0

    invoke-interface {v0}, Ljava/util/Collection;->iterator()Ljava/util/Iterator;

    move-result-object v0

    :goto_0
    invoke-interface {v0}, Ljava/util/Iterator;->hasNext()Z

    move-result v1

    if-eqz v1, :cond_0

    invoke-interface {v0}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Lcom/getcapacitor/PluginCall;

    .line 50
    .local v1, "call":Lcom/getcapacitor/PluginCall;
    invoke-direct {p0, v1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->startWatch(Lcom/getcapacitor/PluginCall;)V

    .line 51
    .end local v1    # "call":Lcom/getcapacitor/PluginCall;
    goto :goto_0

    .line 52
    :cond_0
    return-void
.end method

.method public load()V
    .locals 2

    .line 36
    new-instance v0, Lcom/capacitorjs/plugins/geolocation/Geolocation;

    invoke-virtual {p0}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->getContext()Landroid/content/Context;

    move-result-object v1

    invoke-direct {v0, v1}, Lcom/capacitorjs/plugins/geolocation/Geolocation;-><init>(Landroid/content/Context;)V

    iput-object v0, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->implementation:Lcom/capacitorjs/plugins/geolocation/Geolocation;

    .line 37
    return-void
.end method

.method public requestPermissions(Lcom/getcapacitor/PluginCall;)V
    .locals 1
    .param p1, "call"    # Lcom/getcapacitor/PluginCall;
    .annotation runtime Lcom/getcapacitor/PluginMethod;
    .end annotation

    .line 67
    iget-object v0, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->implementation:Lcom/capacitorjs/plugins/geolocation/Geolocation;

    invoke-virtual {v0}, Lcom/capacitorjs/plugins/geolocation/Geolocation;->isLocationServicesEnabled()Ljava/lang/Boolean;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/Boolean;->booleanValue()Z

    move-result v0

    if-eqz v0, :cond_0

    .line 68
    invoke-super {p0, p1}, Lcom/getcapacitor/Plugin;->requestPermissions(Lcom/getcapacitor/PluginCall;)V

    goto :goto_0

    .line 70
    :cond_0
    const-string v0, "Location services are not enabled"

    invoke-virtual {p1, v0}, Lcom/getcapacitor/PluginCall;->reject(Ljava/lang/String;)V

    .line 72
    :goto_0
    return-void
.end method

.method public watchPosition(Lcom/getcapacitor/PluginCall;)V
    .locals 3
    .param p1, "call"    # Lcom/getcapacitor/PluginCall;
    .annotation runtime Lcom/getcapacitor/PluginMethod;
        returnType = "callback"
    .end annotation

    .line 125
    const/4 v0, 0x1

    invoke-static {v0}, Ljava/lang/Boolean;->valueOf(Z)Ljava/lang/Boolean;

    move-result-object v0

    invoke-virtual {p1, v0}, Lcom/getcapacitor/PluginCall;->setKeepAlive(Ljava/lang/Boolean;)V

    .line 126
    invoke-direct {p0, p1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->getAlias(Lcom/getcapacitor/PluginCall;)Ljava/lang/String;

    move-result-object v0

    .line 127
    .local v0, "alias":Ljava/lang/String;
    invoke-virtual {p0, v0}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->getPermissionState(Ljava/lang/String;)Lcom/getcapacitor/PermissionState;

    move-result-object v1

    sget-object v2, Lcom/getcapacitor/PermissionState;->GRANTED:Lcom/getcapacitor/PermissionState;

    if-eq v1, v2, :cond_0

    .line 128
    const-string v1, "completeWatchPosition"

    invoke-virtual {p0, v0, p1, v1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->requestPermissionForAlias(Ljava/lang/String;Lcom/getcapacitor/PluginCall;Ljava/lang/String;)V

    goto :goto_0

    .line 130
    :cond_0
    invoke-direct {p0, p1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->startWatch(Lcom/getcapacitor/PluginCall;)V

    .line 132
    :goto_0
    return-void
.end method
