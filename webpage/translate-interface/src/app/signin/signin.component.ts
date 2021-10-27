import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { FormBuilder, FormGroup } from '@angular/forms';
import firebase from 'firebase/app';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Text { text: string; }
export interface TextId extends Text { id: string; }

@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss']
})
export class SigninComponent implements OnInit {
  private textCollection: AngularFirestoreCollection<Text>;
  texts: Observable<TextId[]>;

  isAdmin: Observable<boolean> = of(false);

  translate: FormGroup = this.fb.group({
    text: [null],
    ssml: [null]
  });

  constructor(
    public auth: AngularFireAuth,
    private afs: AngularFirestore,
    private storage: AngularFireStorage,
    private fb: FormBuilder
  ) { 
    this.textCollection = afs.collection<Text>('text-to-tts');
    this.texts = this.textCollection.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Text;
        const id = a.payload.doc.id;
        return {id, ...data};
      }))
    );

    this.auth.onAuthStateChanged(user => {
      if (user) {
        this.CheckUser();
      }
    });

  }

  ngOnInit(): void {
  }

  //check if the current user is an admin
  async CheckUser() {
    const currentUser = await this.auth.currentUser;
    const tok = await currentUser.getIdTokenResult();
    this.isAdmin = of(tok.claims.admin);
  }

  login() {
    this.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  }

  logout() {
    this.auth.signOut();
  }

  onSubmit() {
    console.warn(this.translate.value);
    if( (this.translate.value?.text && this.translate.value?.text !== "") || 
    (this.translate.value?.ssml && this.translate.value?.ssml !== "") ) {
      this.addItem(this.translate.value);
      this.translate.setValue({text: "", ssml: ""});
    }
  }

  addItem(item: Text) {
    this.textCollection.add(item);
  }

  async downloadSound(baseName: string) {
    try {
      const fileName = baseName + ".mp3";
      const storedFile = this.storage.storage.ref(fileName);
      const url = await storedFile.getDownloadURL();
      window.open(url, '_blank');
    } catch (error) {
      window.alert(error);
    }
  }

}
