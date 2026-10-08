.class final Lcom/google/android/gms/internal/location/zzdp;
.super Ljava/lang/Object;
.source "com.google.android.gms:play-services-location@@21.1.0"

# interfaces
.implements Lcom/google/android/gms/common/api/internal/ListenerHolder$Notifier;


# instance fields
.field final synthetic zza:Lcom/google/android/gms/internal/location/zzdq;


# direct methods
.method constructor <init>(Lcom/google/android/gms/internal/location/zzdq;)V
    .locals 0

    iput-object p1, p0, Lcom/google/android/gms/internal/location/zzdp;->zza:Lcom/google/android/gms/internal/location/zzdq;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public final bridge synthetic notifyListener(Ljava/lang/Object;)V
    .locals 0

    .line 1
    check-cast p1, Lcom/google/android/gms/location/LocationCallback;

    iget-object p1, p0, Lcom/google/android/gms/internal/location/zzdp;->zza:Lcom/google/android/gms/internal/location/zzdq;

    invoke-virtual {p1}, Lcom/google/android/gms/internal/location/zzdq;->zzh()Lcom/google/android/gms/internal/location/zzdm;

    move-result-object p1

    .line 2
    invoke-interface {p1}, Lcom/google/android/gms/internal/location/zzdm;->zzc()V

    return-void
.end method

.method public final onNotifyListenerFailed()V
    .locals 0

    return-void
.end method
