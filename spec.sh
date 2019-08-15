#!/bin/bash

if [ $1 = "create" ]
then
    git checkout master
    if [ $2 = "todo" ]
    then
      git checkout -b feat/issue-$3
      git push -u origin feat/issue-$3
      mkdir specs/libsass-todo-issues/issue_$3
      touch specs/libsass-todo-issues/issue_$3/{input.scss,output.css}
      subl specs/libsass-todo-issues/issue_$3/input.scss
      git add specs/libsass-todo-issues/issue_$3
      git commit -m "Add specss for issue $3" -m "This PR add specss for sass/libsass#$3"
    elif [ $2 = "closed" ]
    then
      git checkout -b feat/activate-$3
      git push -u origin feat/activate-$3
      mkdir specs/libsass-closed-issues/issue_$3
      touch specs/libsass-closed-issues/issue_$3/{input.scss,output.css}
      subl specs/libsass-closed-issues/issue_$3/input.scss
      git add specs/libsass-closed-issues/issue_$3
      git commit -m "Activate specss for issue $3" -m "This PR activates specss for sass/libsass#$3"
    fi
elif [ $1 = "nuke" ]
then
    if [ $2 = "todo" ]
    then
        ruby sass-specs.rb -c sass specs/libsass-todo-issues/issue_$3 --generate
    elif [ $2 = "closed" ]
    then
        ruby sass-specs.rb -c sass specs/libsass-closed-issues/issue_$3 --generate
    fi
elif [ $1 = "assert" ]
then
    if [ $2 = "todo" ]
    then
        ruby sass-specs.rb -c ~/Projects/Sass/sassc/bin/sassc -s specs/libsass-todo-issues/issue_$3
    elif [ $2 = "closed" ]
    then
        ruby sass-specs.rb -c ~/Projects/Sass/sassc/bin/sassc -s specs/libsass-closed-issues/issue_$3
    fi
elif [ $1 = "enable" ]
then
  # git checkout master
  git mv specs/libsass-todo-issues/issue_$2 specs/libsass-closed-issues
elif [ $1 = "activate" ]
then
  git checkout master
  git checkout -b feat/activate-$2
  git push -u origin feat/activate-$2
  git mv specs/libsass-todo-issues/issue_$2 specs/libsass-closed-issues
  git add specs/libsass-closed-issues/issue_$2
  git commit -m "Activate specss for issue $2" -m "This PR activates specss for sass/libsass#$2"
elif [ $1 = "pr" ]
then
  git push
elif [ $1 = "update" ]
then
  git checkout master
  git fetch upstream
  git merge upstream/master
  git push
fi

# git checkout master
# git checkout -b feat/issue-$1
# mkdir specs/libsass-todo-issues/issue_$1
# touch specs/libsass-todo-issues/issue_$1/{input.scss,output.css}
# subl specs/libsass-todo-issues/issue_$1/input.scss
