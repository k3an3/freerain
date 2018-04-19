import os
import re

from setuptools import setup, find_packages

ROOT = os.path.dirname(__file__)


def parse_requirements(filename):
    requirements = []
    for line in open(filename, 'r').read().split('\n'):
        # Skip comments
        if re.match(r'(\s*#)|(\s*#)', line):
            continue
        requirements.append(line)

    return requirements


setup(
    name='freerain',
    version='1.0',
    packages=find_packages(),
    url='',
    license='MIT',
    author="Keane O' Kelley",
    author_email='keane.m.okelley@gmail.com',
    install_requires=parse_requirements(os.path.join(ROOT, 'requirements.txt')),
    description='',
    entry_points={
        'console_scripts': [
            'freerain-cloud=run:main',
        ]
    }
)
