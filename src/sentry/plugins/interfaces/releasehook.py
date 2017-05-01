"""
sentry.plugins.base.structs
~~~~~~~~~~~~~~~~~~~~~~~~~~~

:copyright: (c) 2010-2013 by the Sentry Team, see AUTHORS for more details.
:license: BSD, see LICENSE for more details.
"""

from __future__ import absolute_import, print_function

__all__ = ['ReleaseHook']

from django.db import IntegrityError, transaction
from django.utils import timezone

from sentry.models import Activity, Release, Repository


class ReleaseHook(object):
    def __init__(self, project):
        self.project = project

    def start_release(self, version, **values):
        try:
            with transaction.atomic():
                release = Release.objects.create(
                    version=version,
                    organization_id=self.project.organization_id,
                    **values
                )
        except IntegrityError:
            release = Release.objects.get(
                version=version,
                organization_id=self.project.organization_id,
            )
            release.update(**values)

        release.add_project(self.project)

    # TODO(dcramer): this is being used by the release details endpoint, but
    # it'd be ideal if most if not all of this logic lived there, and this
    # hook simply called out to the endpoint
    def set_commits(self, version, commit_list):
        """
        Commits should be ordered oldest to newest.

        Calling this method will remove all existing commit history.
        """
        project = self.project
        try:
            with transaction.atomic():
                release = Release.objects.create(
                    organization_id=project.organization_id,
                    version=version
                )
        except IntegrityError:
            release = Release.objects.get(
                organization_id=project.organization_id,
                version=version
            )
        release.add_project(project)

        release.set_commits(commit_list)

    def finish_release(self, version, **values):

        values.setdefault('date_released', timezone.now())
        try:
            with transaction.atomic():
                release = Release.objects.create(
                    version=version,
                    organization_id=self.project.organization_id,
                    **values
                )
        except IntegrityError:
            release = Release.objects.get(
                version=version,
                organization_id=self.project.organization_id,
            )
            release.update(**values)

        release.add_project(self.project)

        Activity.objects.create(
            type=Activity.RELEASE,
            project=self.project,
            ident=version,
            data={'version': version},
            datetime=values['date_released'],
        )

        # check if user exists, and then try to get refs based on version
        if values.get('owner', None):
            repos = Repository.objects.filter(
                organization_id=self.project.organization_id,
            )[0:2]
            if len(repos) == 1:
                release.set_refs(
                    refs=[{
                        'commit': version,
                        'repository': repos[0].name}],
                    user=values['owner'],
                    fetch=True
                )

    def handle(self, request):
        raise NotImplementedError
