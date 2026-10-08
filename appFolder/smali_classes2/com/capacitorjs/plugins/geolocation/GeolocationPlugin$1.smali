.class Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin$1;
.super Ljava/lang/Object;
.source "GeolocationPlugin.java"

# interfaces
.implements Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->completeCurrentPosition(Lcom/getcapacitor/PluginCall;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;

.field final synthetic val$call:Lcom/getcapacitor/PluginCall;


# direct methods
.method constructor <init>(Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;Lcom/getcapacitor/PluginCall;)V
    .locals 0
    .param p1, "this$0"    # Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;
    .annotation system Ldalvik/annotation/MethodParameters;
        accessFlags = {
            0x8010,
            0x1010
        }
        names = {
            null,
            null
        }
    .end annotation

    .annotation system Ldalvik/annotation/Signature;
        value = {
            "()V"
        }
    .end annotation

    .line 100
    iput-object p1, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin$1;->this$0:Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;

    iput-object p2, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin$1;->val$call:Lcom/getcapacitor/PluginCall;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public error(Ljava/lang/String;)V
    .locals 1
    .param p1, "message"    # Ljava/lang/String;

    .line 108
    iget-object v0, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin$1;->val$call:Lcom/getcapacitor/PluginCall;

    invoke-virtual {v0, p1}, Lcom/getcapacitor/PluginCall;->reject(Ljava/lang/String;)V

    .line 109
    return-void
.end method

.method public success(Landroid/location/Location;)V
    .locals 2
    .param p1, "location"    # Landroid/location/Location;

    .line 103
    iget-object v0, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin$1;->val$call:Lcom/getcapacitor/PluginCall;

    iget-object v1, p0, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin$1;->this$0:Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;

    invoke-static {v1, p1}, Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;->-$$Nest$mgetJSObjectForLocation(Lcom/capacitorjs/plugins/geolocation/GeolocationPlugin;Landroid/location/Location;)Lcom/getcapacitor/JSObject;

    move-result-object v1

    invoke-virtual {v0, v1}, Lcom/getcapacitor/PluginCall;->resolve(Lcom/getcapacitor/JSObject;)V

    .line 104
    return-void
.end method
