.class public final synthetic Lcom/capacitorjs/plugins/geolocation/Geolocation$$ExternalSyntheticLambda1;
.super Ljava/lang/Object;
.source "D8$$SyntheticClass"

# interfaces
.implements Lcom/google/android/gms/tasks/OnSuccessListener;


# instance fields
.field public final synthetic f$0:Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;


# direct methods
.method public synthetic constructor <init>(Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;)V
    .locals 0

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation$$ExternalSyntheticLambda1;->f$0:Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;

    return-void
.end method


# virtual methods
.method public final onSuccess(Ljava/lang/Object;)V
    .locals 1

    iget-object v0, p0, Lcom/capacitorjs/plugins/geolocation/Geolocation$$ExternalSyntheticLambda1;->f$0:Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;

    check-cast p1, Landroid/location/Location;

    invoke-static {v0, p1}, Lcom/capacitorjs/plugins/geolocation/Geolocation;->lambda$sendLocation$1(Lcom/capacitorjs/plugins/geolocation/LocationResultCallback;Landroid/location/Location;)V

    return-void
.end method
