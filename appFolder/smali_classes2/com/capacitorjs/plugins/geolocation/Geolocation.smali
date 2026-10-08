.class public Lcom/capacitorjs/plugins/geolocation/Geolocation;
.super Ljava/lang/Object;
.source "Geolocation.java"


# instance fields
.field private context:Landroid/content/Context;

.field private fusedLocationClient:Lcom/google/android/gms/location/FusedLocationProviderClient;

.field private locationCallback:Lcom/google/android/gms/location/LocationCallback;


# direct methods
.method public constructor <init>(Landroid/content/Context;)V
    .locals 0
    .param p1, "context"    # Landroid/content/Context;

    .line 24
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    .line 25
    iput-object p1, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->context:Landroid/content/Context;

    .line 26
    return-void
.end method

.method static synthetic lambda$sendLocation$0(Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;Ljava/lang/Exception;)V
    .locals 1
    .param p0, "resultCallback"    # Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;
    .param p1, "e"    # Ljava/lang/Exception;

    .line 52
    invoke-virtual {p1}, Ljava/lang/Exception;->getMessage()Ljava/lang/String;

    move-result-object v0

    invoke-interface {p0, v0}, Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;->error(Ljava/lang/String;)V

    return-void
.end method

.method static synthetic lambda$sendLocation$1(Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;Landroid/location/Location;)V
    .locals 1
    .param p0, "resultCallback"    # Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;
    .param p1, "location"    # Landroid/location/Location;

    .line 55
    if-nez p1, :cond_0

    .line 56
    const-string v0, "location unavailable"

    invoke-interface {p0, v0}, Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;->error(Ljava/lang/String;)V

    goto :goto_0

    .line 58
    :cond_0
    invoke-interface {p0, p1}, Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;->success(Landroid/location/Location;)V

    .line 60
    :goto_0
    return-void
.end method


# virtual methods
.method public clearLocationUpdates()V
    .locals 2

    .line 122
    iget-object v0, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->locationCallback:Lcom/google/android/gms/location/LocationCallback;

    if-eqz v0, :cond_0

    .line 123
    iget-object v1, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->fusedLocationClient:Lcom/google/android/gms/location/FusedLocationProviderClient;

    invoke-interface {v1, v0}, Lcom/google/android/gms/location/FusedLocationProviderClient;->removeLocationUpdates(Lcom/google/android/gms/location/LocationCallback;)Lcom/google/android/gms/tasks/Task;

    .line 124
    const/4 v0, 0x0

    iput-object v0, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->locationCallback:Lcom/google/android/gms/location/LocationCallback;

    .line 126
    :cond_0
    return-void
.end method

.method public getLastLocation(I)Landroid/location/Location;
    .locals 14
    .param p1, "maximumAge"    # I

    .line 130
    const/4 v0, 0x0

    .line 131
    .local v0, "lastLoc":Landroid/location/Location;
    iget-object v1, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->context:Landroid/content/Context;

    const-string v2, "location"

    invoke-virtual {v1, v2}, Landroid/content/Context;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Landroid/location/LocationManager;

    .line 132
    .local v1, "lm":Landroid/location/LocationManager;
    invoke-virtual {v1}, Landroid/location/LocationManager;->getAllProviders()Ljava/util/List;

    move-result-object v2

    invoke-interface {v2}, Ljava/util/List;->iterator()Ljava/util/Iterator;

    move-result-object v2

    :goto_0
    invoke-interface {v2}, Ljava/util/Iterator;->hasNext()Z

    move-result v3

    if-eqz v3, :cond_2

    invoke-interface {v2}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object v3

    check-cast v3, Ljava/lang/String;

    .line 133
    .local v3, "provider":Ljava/lang/String;
    invoke-virtual {v1, v3}, Landroid/location/LocationManager;->getLastKnownLocation(Ljava/lang/String;)Landroid/location/Location;

    move-result-object v4

    .line 134
    .local v4, "tmpLoc":Landroid/location/Location;
    if-eqz v4, :cond_1

    .line 135
    invoke-static {}, Landroid/os/SystemClock;->elapsedRealtimeNanos()J

    move-result-wide v5

    invoke-virtual {v4}, Landroid/location/Location;->getElapsedRealtimeNanos()J

    move-result-wide v7

    sub-long/2addr v5, v7

    .line 136
    .local v5, "locationAge":J
    int-to-long v7, p1

    const-wide/32 v9, 0xf4240

    mul-long v7, v7, v9

    .line 137
    .local v7, "maximumAgeNanoSec":J
    cmp-long v9, v5, v7

    if-gtz v9, :cond_1

    if-eqz v0, :cond_0

    .line 139
    invoke-virtual {v0}, Landroid/location/Location;->getElapsedRealtimeNanos()J

    move-result-wide v9

    invoke-virtual {v4}, Landroid/location/Location;->getElapsedRealtimeNanos()J

    move-result-wide v11

    cmp-long v13, v9, v11

    if-lez v13, :cond_1

    .line 141
    :cond_0
    move-object v0, v4

    .line 144
    .end local v3    # "provider":Ljava/lang/String;
    .end local v4    # "tmpLoc":Landroid/location/Location;
    .end local v5    # "locationAge":J
    .end local v7    # "maximumAgeNanoSec":J
    :cond_1
    goto :goto_0

    .line 145
    :cond_2
    return-object v0
.end method

.method public isLocationServicesEnabled()Ljava/lang/Boolean;
    .locals 2

    .line 29
    iget-object v0, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->context:Landroid/content/Context;

    const-string v1, "location"

    invoke-virtual {v0, v1}, Landroid/content/Context;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Landroid/location/LocationManager;

    .line 30
    .local v0, "lm":Landroid/location/LocationManager;
    invoke-static {v0}, Landroidx/core/location/LocationManagerCompat;->isLocationEnabled(Landroid/location/LocationManager;)Z

    move-result v1

    invoke-static {v1}, Ljava/lang/Boolean;->valueOf(Z)Ljava/lang/Boolean;

    move-result-object v1

    return-object v1
.end method

.method public requestLocationUpdates(ZIILcom/capacitorjs/plugins/geolocation/LocationResultCallback;)V
    .locals 9
    .param p1, "enableHighAccuracy"    # Z
    .param p2, "timeout"    # I
    .param p3, "minUpdateInterval"    # I
    .param p4, "resultCallback"    # Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;

    .line 77
    invoke-static {}, Lcom/google/android/gms/common/GoogleApiAvailability;->getInstance()Lcom/google/android/gms/common/GoogleApiAvailability;

    move-result-object v0

    iget-object v1, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->context:Landroid/content/Context;

    invoke-virtual {v0, v1}, Lcom/google/android/gms/common/GoogleApiAvailability;->isGooglePlayServicesAvailable(Landroid/content/Context;)I

    move-result v0

    .line 78
    .local v0, "resultCode":I
    if-nez v0, :cond_3

    .line 79
    invoke-virtual {p0}, Lcom/capacitorjs/plugins/geolocation/Geolocation;->clearLocationUpdates()V

    .line 80
    iget-object v1, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->context:Landroid/content/Context;

    invoke-static {v1}, Lcom/google/android/gms/location/LocationServices;->getFusedLocationProviderClient(Landroid/content/Context;)Lcom/google/android/gms/location/FusedLocationProviderClient;

    move-result-object v1

    iput-object v1, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->fusedLocationClient:Lcom/google/android/gms/location/FusedLocationProviderClient;

    .line 82
    iget-object v1, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->context:Landroid/content/Context;

    const-string v2, "location"

    invoke-virtual {v1, v2}, Landroid/content/Context;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Landroid/location/LocationManager;

    .line 83
    .local v1, "lm":Landroid/location/LocationManager;
    invoke-virtual {p0}, Lcom/capacitorjs/plugins/geolocation/Geolocation;->isLocationServicesEnabled()Ljava/lang/Boolean;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/Boolean;->booleanValue()Z

    move-result v2

    if-eqz v2, :cond_2

    .line 84
    const/4 v2, 0x0

    .line 87
    .local v2, "networkEnabled":Z
    :try_start_0
    const-string v3, "network"

    invoke-virtual {v1, v3}, Landroid/location/LocationManager;->isProviderEnabled(Ljava/lang/String;)Z

    move-result v3
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    move v2, v3

    goto :goto_0

    .line 88
    :catch_0
    move-exception v3

    :goto_0
    nop

    .line 90
    if-eqz v2, :cond_0

    const/16 v3, 0x66

    goto :goto_1

    :cond_0
    const/16 v3, 0x68

    .line 91
    .local v3, "lowPriority":I
    :goto_1
    if-eqz p1, :cond_1

    const/16 v4, 0x64

    goto :goto_2

    :cond_1
    move v4, v3

    .line 93
    .local v4, "priority":I
    :goto_2
    new-instance v5, Lcom/google/android/gms/location/LocationRequest$Builder;

    const-wide/16 v6, 0x2710

    invoke-direct {v5, v6, v7}, Lcom/google/android/gms/location/LocationRequest$Builder;-><init>(J)V

    int-to-long v6, p2

    .line 94
    invoke-virtual {v5, v6, v7}, Lcom/google/android/gms/location/LocationRequest$Builder;->setMaxUpdateDelayMillis(J)Lcom/google/android/gms/location/LocationRequest$Builder;

    move-result-object v5

    int-to-long v6, p3

    .line 95
    invoke-virtual {v5, v6, v7}, Lcom/google/android/gms/location/LocationRequest$Builder;->setMinUpdateIntervalMillis(J)Lcom/google/android/gms/location/LocationRequest$Builder;

    move-result-object v5

    .line 96
    invoke-virtual {v5, v4}, Lcom/google/android/gms/location/LocationRequest$Builder;->setPriority(I)Lcom/google/android/gms/location/LocationRequest$Builder;

    move-result-object v5

    .line 97
    invoke-virtual {v5}, Lcom/google/android/gms/location/LocationRequest$Builder;->build()Lcom/google/android/gms/location/LocationRequest;

    move-result-object v5

    .line 99
    .local v5, "locationRequest":Lcom/google/android/gms/location/LocationRequest;
    new-instance v6, Lcom/capacitorjs/plugins/geolocation/Geolocation$1;

    invoke-direct {v6, p0, p4}, Lcom/capacitorjs/plugins/geolocation/Geolocation$1;-><init>(Lcom/capacitorjs/plugins/geolocation/Geolocation;Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;)V

    iput-object v6, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->locationCallback:Lcom/google/android/gms/location/LocationCallback;

    .line 112
    iget-object v7, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->fusedLocationClient:Lcom/google/android/gms/location/FusedLocationProviderClient;

    const/4 v8, 0x0

    invoke-interface {v7, v5, v6, v8}, Lcom/google/android/gms/location/FusedLocationProviderClient;->requestLocationUpdates(Lcom/google/android/gms/location/LocationRequest;Lcom/google/android/gms/location/LocationCallback;Landroid/os/Looper;)Lcom/google/android/gms/tasks/Task;

    .line 113
    .end local v2    # "networkEnabled":Z
    .end local v3    # "lowPriority":I
    .end local v4    # "priority":I
    .end local v5    # "locationRequest":Lcom/google/android/gms/location/LocationRequest;
    goto :goto_3

    .line 114
    :cond_2
    const-string v2, "location disabled"

    invoke-interface {p4, v2}, Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;->error(Ljava/lang/String;)V

    .line 116
    .end local v1    # "lm":Landroid/location/LocationManager;
    :goto_3
    goto :goto_4

    .line 117
    :cond_3
    const-string v1, "Google Play Services not available"

    invoke-interface {p4, v1}, Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;->error(Ljava/lang/String;)V

    .line 119
    :goto_4
    return-void
.end method

.method public sendLocation(ZLcom/capacitorjs/plugins/geolocation/LocationResultCallback;)V
    .locals 7
    .param p1, "enableHighAccuracy"    # Z
    .param p2, "resultCallback"    # Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;

    .line 35
    invoke-static {}, Lcom/google/android/gms/common/GoogleApiAvailability;->getInstance()Lcom/google/android/gms/common/GoogleApiAvailability;

    move-result-object v0

    iget-object v1, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->context:Landroid/content/Context;

    invoke-virtual {v0, v1}, Lcom/google/android/gms/common/GoogleApiAvailability;->isGooglePlayServicesAvailable(Landroid/content/Context;)I

    move-result v0

    .line 36
    .local v0, "resultCode":I
    if-nez v0, :cond_3

    .line 37
    iget-object v1, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->context:Landroid/content/Context;

    const-string v2, "location"

    invoke-virtual {v1, v2}, Landroid/content/Context;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Landroid/location/LocationManager;

    .line 39
    .local v1, "lm":Landroid/location/LocationManager;
    invoke-virtual {p0}, Lcom/capacitorjs/plugins/geolocation/Geolocation;->isLocationServicesEnabled()Ljava/lang/Boolean;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/Boolean;->booleanValue()Z

    move-result v2

    if-eqz v2, :cond_2

    .line 40
    const/4 v2, 0x0

    .line 43
    .local v2, "networkEnabled":Z
    :try_start_0
    const-string v3, "network"

    invoke-virtual {v1, v3}, Landroid/location/LocationManager;->isProviderEnabled(Ljava/lang/String;)Z

    move-result v3
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    move v2, v3

    goto :goto_0

    .line 44
    :catch_0
    move-exception v3

    :goto_0
    nop

    .line 46
    if-eqz v2, :cond_0

    const/16 v3, 0x66

    goto :goto_1

    :cond_0
    const/16 v3, 0x68

    .line 47
    .local v3, "lowPriority":I
    :goto_1
    if-eqz p1, :cond_1

    const/16 v4, 0x64

    goto :goto_2

    :cond_1
    move v4, v3

    .line 49
    .local v4, "priority":I
    :goto_2
    iget-object v5, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation;->context:Landroid/content/Context;

    .line 50
    invoke-static {v5}, Lcom/google/android/gms/location/LocationServices;->getFusedLocationProviderClient(Landroid/content/Context;)Lcom/google/android/gms/location/FusedLocationProviderClient;

    move-result-object v5

    .line 51
    const/4 v6, 0x0

    invoke-interface {v5, v4, v6}, Lcom/google/android/gms/location/FusedLocationProviderClient;->getCurrentLocation(ILcom/google/android/gms/tasks/CancellationToken;)Lcom/google/android/gms/tasks/Task;

    move-result-object v5

    new-instance v6, Lcom/capacitorjs/plugins/geolocation/Geolocation$$ExternalSyntheticLambda0;

    invoke-direct {v6, p2}, Lcom/capacitorjs/plugins/geolocation/Geolocation$$ExternalSyntheticLambda0;-><init>(Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;)V

    .line 52
    invoke-virtual {v5, v6}, Lcom/google/android/gms/tasks/Task;->addOnFailureListener(Lcom/google/android/gms/tasks/OnFailureListener;)Lcom/google/android/gms/tasks/Task;

    move-result-object v5

    new-instance v6, Lcom/capacitorjs/plugins/geolocation/Geolocation$$ExternalSyntheticLambda1;

    invoke-direct {v6, p2}, Lcom/capacitorjs/plugins/geolocation/Geolocation$$ExternalSyntheticLambda1;-><init>(Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;)V

    .line 53
    invoke-virtual {v5, v6}, Lcom/google/android/gms/tasks/Task;->addOnSuccessListener(Lcom/google/android/gms/tasks/OnSuccessListener;)Lcom/google/android/gms/tasks/Task;

    .line 62
    .end local v2    # "networkEnabled":Z
    .end local v3    # "lowPriority":I
    .end local v4    # "priority":I
    goto :goto_3

    .line 63
    :cond_2
    const-string v2, "location disabled"

    invoke-interface {p2, v2}, Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;->error(Ljava/lang/String;)V

    .line 65
    .end local v1    # "lm":Landroid/location/LocationManager;
    :goto_3
    goto :goto_4

    .line 66
    :cond_3
    const-string v1, "Google Play Services not available"

    invoke-interface {p2, v1}, Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;->error(Ljava/lang/String;)V

    .line 68
    :goto_4
    return-void
.end method
