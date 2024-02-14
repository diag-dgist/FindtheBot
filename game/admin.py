"""
Django admin config.

django admin 사용을 위해 모델 등록.

"""
from django.contrib import admin
from .models import Member,Channel_1, Channel_2, Channel_3, Channel_4, Entries

class EntriesAdmin(admin.ModelAdmin):
    list_display = ('image_id', 'emotion_id', 'E1_flag', 'E2_flag', 'E3_flag')
    search_fields = ['image_id', 'emotion_id']
    
#admin에서 관리할 models 전부 등록
admin.site.register(Member)
admin.site.register(Channel_1)
admin.site.register(Channel_2)
admin.site.register(Channel_3)
admin.site.register(Channel_4)
admin.site.register(Entries, EntriesAdmin)


