.class Lcom/capacitorjs/plugins/geolocation/Geolocation$1;
.super Lcom/google/android/gms/location/LocationCallback;
.source "Geolocation.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/capacitorjs/plugins/geolocation/Geolocation;->requestLocationUpdates(ZIILcom/capacitorjs/plugins/geolocation/LocationResultCallback;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/capacitorjs/plugins/geolocation/Geolocation;

.field final synthetic val$resultCallback:Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;


# direct methods
.method constructor <init>(Lcom/capacitorjs/plugins/geolocation/Geolocation;Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;)V
    .locals 0
    .param p1, "this$0"    # Lcom/capacitorjs/plugins/geolocation/Geolocation;
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

    .line 100
    iput-object p1, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation$1;->this$0:Lcom/capacitorjs/plugins/geolocation/Geolocation;

    iput-object p2, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation$1;->val$resultCallback:Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;

    invoke-direct {p0}, Lcom/google/android/gms/location/LocationCallback;-><init>()V

    return-void
.end method


# virtual methods
.method public onLocationResult(Lcom/google/android/gms/location/LocationResult;)V
    .locals 3
    .param p1, "locationResult"    # Lcom/google/android/gms/location/LocationResult;

    .line 103
    invoke-virtual {p1}, Lcom/google/android/gms/location/LocationResult;->getLastLocation()Landroid/location/Location;

    move-result-object v0

    .line 104
    .local v0, "lastLocation":Landroid/location/Location;
    if-nez v0, :cond_0

    .line 105
    iget-object v1, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation$1;->val$resultCallback:Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;

    const-string v2, "location unavailable"

    invoke-interface {v1, v2}, Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;->error(Ljava/lang/String;)V

    goto :goto_0

    .line 107
    :cond_0
    iget-object v1, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation$1;->val$resultCallback:Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;

    invoke-interface {v1, v0}, Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;->success(Landroid/location/Location;)V

    .line 109
    :goto_0
    return-void
.end method
